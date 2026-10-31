const XLSX = require('xlsx');
const { MODELS, IMPORT_ORDER, IMPORT_FIELDS, coerceIn, prisma } = require('./dataModels');

const DATE_FIELDS = new Set(['date', 'generatedDate', 'approvedDate', 'createdAt']);
const LOOKUP_LABEL = { customer: 'Customer', employee: 'Employee', invoice: 'Invoice' };

// Cells are read raw (no cellDates) because SheetJS builds Dates at *local*
// midnight, which lands on the previous day in UTC+ timezones once stored in
// a DATE column. Excel serials and text dates are converted to UTC here.
function parseDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(Math.round((value - 25569) * 86400000));
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function coerce(col, raw) {
  if (DATE_FIELDS.has(col)) return parseDate(raw);
  return coerceIn(col, raw);
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function readWorkbook(buffer) {
  return XLSX.read(buffer, { cellDates: false, raw: false });
}

function sheetRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
}

function sheetHeaders(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
  return (rows[0] || []).map((h) => (h == null ? '' : String(h).trim())).filter(Boolean);
}

function findSheetForModel(workbook, modelKey) {
  const model = MODELS[modelKey];
  const wanted = [modelKey.toLowerCase(), model.label.toLowerCase()];
  return workbook.SheetNames.find((n) => wanted.includes(n.toLowerCase())) || workbook.SheetNames[0];
}

// Best-guess mapping from a file's headers to this model's fields.
function suggestMapping(modelKey, headers) {
  const fields = IMPORT_FIELDS[modelKey];
  const used = new Set();
  const mapping = {};
  for (const h of headers) {
    const nh = norm(h);
    const match = fields.find((f) => !used.has(f.key) && (norm(f.key) === nh || norm(f.label) === nh))
      || fields.find((f) => !used.has(f.key) && (f.aliases || []).some((a) => norm(a) === nh));
    mapping[h] = match ? match.key : '';
    if (match) used.add(match.key);
  }
  return mapping;
}

function previewFile(modelKey, buffer) {
  assertImportable(modelKey);
  const workbook = readWorkbook(buffer);
  const sheet = workbook.Sheets[findSheetForModel(workbook, modelKey)];
  const headers = sheetHeaders(sheet);
  const rows = sheetRows(sheet);
  return {
    headers,
    rowCount: rows.length,
    sample: rows.slice(0, 3),
    fields: IMPORT_FIELDS[modelKey].map(({ key, label, required, lookup }) => ({ key, label, required: Boolean(required), lookup: Boolean(lookup) })),
    mapping: suggestMapping(modelKey, headers)
  };
}

function assertImportable(modelKey) {
  if (!MODELS[modelKey] || !MODELS[modelKey].importable) {
    const err = new Error('This page does not support importing data.');
    err.status = 400;
    throw err;
  }
}

// Name → id lookups for parent records, built once per import run and
// refreshed between models so freshly imported parents are found.
async function buildLookups() {
  const [customers, employees, invoices] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, company: true, name: true, customerCode: true } }),
    prisma.employee.findMany({ select: { id: true, name: true } }),
    prisma.invoice.findMany({ select: { id: true, invoiceNo: true } })
  ]);
  const index = (list, keys) => {
    const m = new Map();
    list.forEach((r) => keys.forEach((k) => { if (r[k]) m.set(norm(r[k]), r.id); }));
    return m;
  };
  return {
    customer: index(customers, ['customerCode', 'name', 'company']),
    employee: index(employees, ['name']),
    invoice: index(invoices, ['invoiceNo']),
    ids: {
      customer: new Set(customers.map((c) => c.id)),
      employee: new Set(employees.map((e) => e.id)),
      invoice: new Set(invoices.map((i) => i.id))
    }
  };
}

const FK = {
  customerId: 'customer',
  designerId: 'employee',
  salespersonId: 'employee',
  invoiceId: 'invoice'
};

function mapRow(modelKey, row, mapping) {
  // No mapping (e.g. "Import all") means headers already are field keys.
  if (!mapping) return row;
  const out = {};
  for (const [header, key] of Object.entries(mapping)) {
    if (key) out[key] = row[header];
  }
  return out;
}

// Registers a newly created/merged-into customer in the shared lookups so
// later rows in this same import — or a later lookup against another model
// in the same run — resolve to it instead of missing it or recreating it.
function registerCustomer(customer, lookups) {
  [customer.customerCode, customer.name, customer.company].forEach((v) => { if (v) lookups.customer.set(norm(v), customer.id); });
  lookups.ids.customer.add(customer.id);
}

async function autoCreateCustomer(rawName, currency, lookups) {
  if (!rawName) return null;
  const created = await prisma.customer.create({
    data: {
      name: rawName,
      company: rawName,
      country: 'Unknown',
      currency: currency || 'PKR',
      email: '',
      emailClient: '',
      contact: ''
    }
  });
  registerCustomer(created, lookups);
  return created.id;
}

async function upsertRow(modelKey, rawRow, lookups) {
  const model = MODELS[modelKey];
  const prismaModel = prisma[model.prismaModel];
  const fields = IMPORT_FIELDS[modelKey];
  const data = {};

  for (const f of fields) {
    if (f.key === 'id' || f.lookup) continue;
    const raw = rawRow[f.key];
    if (raw === undefined || raw === null || raw === '') continue;
    const v = coerce(f.key, raw);
    if (v !== null) data[f.key] = v;
  }

  for (const f of fields.filter((x) => x.lookup)) {
    const raw = rawRow[f.key];
    if (raw === undefined || raw === null || raw === '' || data[f.target] != null) continue;
    let id = lookups[f.lookup].get(norm(raw));
    // An orders sheet referencing a customer by name that doesn't exist yet
    // is the normal shape of a hand-kept monthly log (new clients show up
    // mixed in with repeat ones) — create a minimal customer for it instead
    // of failing the row, so it doesn't have to be pre-imported separately.
    if (!id && f.lookup === 'customer') id = await autoCreateCustomer(String(raw).trim(), data.currency, lookups);
    if (!id) throw new Error(`${LOOKUP_LABEL[f.lookup]} "${raw}" was not found.`);
    data[f.target] = id;
  }

  for (const [col, kind] of Object.entries(FK)) {
    if (data[col] != null && !lookups.ids[kind].has(data[col])) {
      throw new Error(`${LOOKUP_LABEL[kind]} #${data[col]} isn't in the system — import it first, or check that ${LOOKUP_LABEL[kind].toLowerCase()}'s row for errors.`);
    }
  }

  if (modelKey === 'customers' && data.customerCode) {
    const clash = await prisma.customer.findUnique({ where: { customerCode: data.customerCode } });
    const rowId = rawRow.id ? Number(rawRow.id) : null;
    if (clash && clash.id !== rowId) {
      throw new Error(`Customer code ${data.customerCode} is already used by "${clash.company}" (#${clash.id}).`);
    }
  }

  const idRaw = rawRow.id;
  const id = idRaw !== undefined && idRaw !== null && idRaw !== '' ? Number(idRaw) : null;
  const existing = id ? await prismaModel.findUnique({ where: { id } }) : null;
  if (existing) {
    await prismaModel.update({ where: { id }, data });
    return 'updated';
  }

  // No explicit id — for customers, a second file (or a later row in the
  // same file) often re-enters the same client by hand with a slightly
  // different spelling/case ("Jason" vs "jason"). Match on the normalized
  // company/name against what's already in the system (and what this import
  // run has created so far) and merge into it instead of creating a
  // duplicate customer.
  if (modelKey === 'customers' && !id) {
    const matchId = (data.company && lookups.customer.get(norm(data.company)))
      || (data.name && lookups.customer.get(norm(data.name)));
    if (matchId) {
      await prismaModel.update({ where: { id: matchId }, data });
      return 'merged';
    }
  }

  if (modelKey === 'invoices' && !data.approvedDate && data.generatedDate) data.approvedDate = data.generatedDate;
  // ID fields (customerId/designerId) may have been filled by a name lookup above.
  const missing = fields.filter((f) => f.required && data[f.key] == null).map((f) => f.label.replace(' ID', ''));
  if (missing.length) throw new Error(`Missing required: ${missing.join(', ')}.`);

  if (modelKey === 'customers') {
    // Blank in older data, but non-null columns in the schema.
    for (const k of ['email', 'contact', 'emailClient']) if (data[k] == null) data[k] = '';
  }
  const created = await prismaModel.create({ data: id ? { id, ...data } : data });

  if (modelKey === 'customers') {
    // So a later row in this same import (or a lookup from an orders sheet
    // right after) finds this customer too, instead of only ones that were
    // already in the database when buildLookups() ran.
    registerCustomer(created, lookups);
  }
  return 'created';
}

async function resetSequence(modelKey) {
  const table = { orders: 'Order', invoices: 'Invoice', customers: 'Customer', employees: 'Employee' }[modelKey];
  // Rows imported with explicit ids don't advance the autoincrement
  // sequence, so the next record created in the app would collide.
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`);
}

// Keep the CUST-#### counter ahead of any imported codes.
async function bumpCustomerCodeCounter() {
  const rows = await prisma.customer.findMany({ where: { customerCode: { startsWith: 'CUST-' } }, select: { customerCode: true } });
  const max = rows.reduce((m, r) => Math.max(m, Number(r.customerCode.slice(5)) || 0), 0);
  const counter = await prisma.counter.findUnique({ where: { id: 1 } });
  if (counter && counter.nextCustomerCode <= max) {
    await prisma.counter.update({ where: { id: 1 }, data: { nextCustomerCode: max + 1 } });
  }
}

async function importRows(modelKey, jsonRows, mapping) {
  const result = { created: 0, updated: 0, merged: 0, skipped: 0, errors: [] };
  const lookups = await buildLookups();
  for (let i = 0; i < jsonRows.length; i++) {
    const row = mapRow(modelKey, jsonRows[i], mapping);
    if (Object.values(row).every((v) => v === null || v === undefined || v === '')) { result.skipped += 1; continue; }
    try {
      const outcome = await upsertRow(modelKey, row, lookups);
      result[outcome] += 1;
    } catch (err) {
      // Prisma errors carry a multi-line explanation — the last line is the reason.
      const lines = String(err.message).split('\n').map((l) => l.trim()).filter(Boolean);
      result.errors.push({ row: i + 2, message: lines[lines.length - 1] || err.message });
    }
  }
  await resetSequence(modelKey);
  if (modelKey === 'customers') await bumpCustomerCodeCounter();
  return result;
}

async function importModel(modelKey, buffer, mapping) {
  assertImportable(modelKey);
  const workbook = readWorkbook(buffer);
  const sheet = workbook.Sheets[findSheetForModel(workbook, modelKey)];
  return importRows(modelKey, sheetRows(sheet), mapping);
}

async function importWorkbook(buffer) {
  const workbook = readWorkbook(buffer);
  const results = {};
  for (const modelKey of IMPORT_ORDER) {
    const model = MODELS[modelKey];
    const wanted = [modelKey.toLowerCase(), model.label.toLowerCase()];
    const sheetName = workbook.SheetNames.find((n) => wanted.includes(n.toLowerCase()));
    if (!sheetName) continue;
    results[modelKey] = await importRows(modelKey, sheetRows(workbook.Sheets[sheetName]), null);
  }
  return results;
}

module.exports = { importModel, importWorkbook, previewFile };
