// "Import old data" — reads a client's own order spreadsheet (one row per
// order, not our export format), works out which customers / designers /
// salespeople the rows refer to, and imports the orders after the admin has
// reviewed the matches.
//
// Built around sheets like:
//   Month Of September
//   Date | Name | Email | Design Name | USD | GBP | AUD | | Designer Name | payment
//   1 Sep | Diane us | karen@gmail.com | COTHREN logo | $8 | - | - | | Hamza | 400
//   …
//   | | | Total Designs 53 | $181 | 162 GBp | 122 Aud | | | 31,400
// but tolerant of other column names, a single Price + Currency column pair,
// several month sheets in one file, and text dates without a year.

const XLSX = require('xlsx');
const prisma = require('./prisma');
const { generateInvoicePrefix } = require('./invoiceNumber');
const { generateSlipPrefix } = require('./slipNumber');
const { getDefaultCurrency } = require('./currency');

const CURRENCIES = ['USD', 'GBP', 'AUD', 'EUR'];
const CURRENCY_COUNTRY = { GBP: 'United Kingdom', USD: 'United States', AUD: 'Australia', EUR: 'Europe' };
const COUNTRY_SUFFIX = { us: 'United States', usa: 'United States', uk: 'United Kingdom', gb: 'United Kingdom', aus: 'Australia', au: 'Australia', eu: 'Europe' };
const GENERIC_DOMAINS = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'live.com', 'aol.com', 'msn.com', 'me.com', 'googlemail.com', 'hotmail.co.uk', 'yahoo.co.uk']);
// Placeholders people type where the customer's email should be.
const NO_IDENTIFIER = new Set(['wtsp', 'whatsapp', 'whats app', 'wa', 'dm', 'instagram', 'insta', 'fb', 'facebook', 'na', 'n/a', 'none', '-', 'phone', 'call']);
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const compact = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
const titleCase = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());

// ---------- column detection ----------
const COLUMN_ALIASES = {
  date: ['date', 'order date', 'day', 'dated'],
  name: ['name', 'customer', 'customer name', 'client', 'client name', 'contact', 'contact name'],
  identifier: ['email', 'e mail', 'email address', 'mail', 'company', 'business', 'company name', 'customer email'],
  orderName: ['design name', 'design', 'order', 'order name', 'description', 'item', 'logo', 'job'],
  designer: ['designer', 'designer name', 'digitizer', 'digitiser'],
  salesperson: ['salesperson', 'sales person', 'sales rep', 'agent', 'sales'],
  productionCost: ['payment', 'production cost', 'cost', 'designer payment', 'pay'],
  price: ['price', 'amount', 'rate', 'charge'],
  currency: ['currency', 'ccy'],
  status: ['status']
};
const FIELD_LABELS = {
  date: 'Order date', name: 'Customer name', identifier: 'Customer email / company', orderName: 'Order name',
  designer: 'Designer', salesperson: 'Salesperson', productionCost: 'Production cost', price: 'Price', currency: 'Currency', status: 'Status'
};

function currencyOfHeader(h) {
  const n = norm(h).replace(/\s+/g, '');
  if (['usd', 'us', 'dollar', 'dollars', 'usdollar'].includes(n)) return 'USD';
  if (['gbp', 'pound', 'pounds', 'uk', 'gbpound'].includes(n)) return 'GBP';
  if (['aud', 'aus', 'australia', 'audollar'].includes(n)) return 'AUD';
  if (['eur', 'euro', 'euros'].includes(n)) return 'EUR';
  return null;
}

function guessMapping(header) {
  const mapping = {};
  const priceColumns = {};
  header.forEach((h, idx) => {
    if (!String(h).trim()) return;
    const ccy = currencyOfHeader(h);
    if (ccy) { priceColumns[ccy] = idx; return; }
    const n = norm(h);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (mapping[field] == null && aliases.includes(n)) { mapping[field] = idx; return; }
    }
  });
  return { mapping, priceColumns };
}

function findHeaderRow(rows) {
  let best = -1; let bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const { mapping, priceColumns } = guessMapping(rows[i]);
    const score = Object.keys(mapping).length + Object.keys(priceColumns).length;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  return bestScore >= 3 ? best : -1;
}

// ---------- values ----------
function titleMonthYear(rows, headerIdx) {
  for (let i = 0; i < headerIdx; i++) {
    const text = rows[i].map((c) => String(c)).join(' ').toLowerCase();
    const m = MONTHS.findIndex((mm) => new RegExp(`\\b${mm}`).test(text));
    if (m >= 0) {
      const y = text.match(/\b(19|20)\d{2}\b/);
      return { month: m, year: y ? Number(y[0]) : null };
    }
  }
  return { month: null, year: null };
}

const fromSerial = (serial) => new Date(Math.round(serial - 25569) * 86400000);
const ymd = (d) => d.toISOString().slice(0, 10);

// Returns { date: 'YYYY-MM-DD', fromCell: bool } or null.
function parseDate(value, fallbackYear, fallbackMonth) {
  if (value === '' || value == null) return null;
  if (typeof value === 'number' && value > 1000) return { date: ymd(fromSerial(value)), fromCell: true };
  const s = String(value).trim().toLowerCase();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return { date: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`, fromCell: true };
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return { date: `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, fromCell: true };
  }
  // "14Sep", "11 sept", "1 Sep 2023", "Sep 14"
  m = s.match(/^(\d{1,2})\s*([a-z]{3,9})\.?\s*(\d{4})?$/) || s.match(/^([a-z]{3,9})\.?\s*(\d{1,2})(?:,?\s*(\d{4}))?$/);
  if (m) {
    const [day, mon, yr] = /^\d/.test(m[1]) ? [m[1], m[2], m[3]] : [m[2], m[1], m[3]];
    const month = MONTHS.indexOf(mon.slice(0, 3));
    if (month >= 0) {
      const y = yr ? Number(yr) : fallbackYear;
      return { date: `${y}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, fromCell: !!yr };
    }
  }
  // Just a day number, with the month from the sheet title.
  m = s.match(/^(\d{1,2})$/);
  if (m && fallbackMonth != null) return { date: `${fallbackYear}-${String(fallbackMonth + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`, fromCell: false };
  return null;
}

// "$8", "4", "18", "1,200", "-", "free trail" → { kind: 'price'|'free'|'none', amount }
function parseMoney(value) {
  if (value === '' || value == null) return { kind: 'none' };
  if (typeof value === 'number') return { kind: 'price', amount: value };
  const s = String(value).trim().toLowerCase();
  if (!s || /^[-–—]+$/.test(s)) return { kind: 'none' };
  if (/free/.test(s)) return { kind: 'free', amount: 0 };
  const n = Number(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) && /\d/.test(s) ? { kind: 'price', amount: n } : { kind: 'none' };
}

// ---------- reading a workbook ----------
function readSheets(buffer, options) {
  const workbook = XLSX.read(buffer, { cellDates: false });
  const sheets = [];
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: true, blankrows: true });
    const headerIdx = findHeaderRow(rows);
    if (headerIdx < 0) continue;
    const title = titleMonthYear(rows, headerIdx);
    const rowOffset = XLSX.utils.decode_range(workbook.Sheets[sheetName]['!ref']).s.r;
    sheets.push({ sheetName, rows, rowOffset, headerIdx, header: rows[headerIdx].map((h) => String(h).trim()), title });
  }
  return sheets;
}

function rowCells(r, idx) { return idx == null ? '' : r[idx]; }

// One sheet → normalised rows (with per-row problems).
function parseSheetRows(sheet, mapping, priceColumns, year) {
  const out = [];
  const fallbackYear = sheet.title.year || year;
  for (let i = sheet.headerIdx + 1; i < sheet.rows.length; i++) {
    const r = sheet.rows[i];
    const texts = r.map((c) => String(c).trim());
    if (!texts.some(Boolean)) continue;
    // "Total Designs 53 | $181 | …" summary rows.
    if (texts.some((t) => /^total\b/i.test(t)) && !String(rowCells(r, mapping.date)).trim()) continue;

    const errors = [];
    const warnings = [];
    const rawName = String(rowCells(r, mapping.name)).trim();
    const rawIdentifier = String(rowCells(r, mapping.identifier)).trim();
    const orderName = String(rowCells(r, mapping.orderName)).trim();
    const designer = String(rowCells(r, mapping.designer)).trim();
    const salesperson = String(rowCells(r, mapping.salesperson)).trim();

    const parsedDate = parseDate(rowCells(r, mapping.date), fallbackYear, sheet.title.month);
    if (!parsedDate) errors.push('Date not recognised');

    // Price: either one column per currency (the currency is the column),
    // or a single Price column plus a Currency column.
    let price = 0; let currency = null; let freeTrial = false;
    const hits = [];
    for (const [ccy, idx] of Object.entries(priceColumns)) {
      const v = parseMoney(r[idx]);
      if (v.kind !== 'none') hits.push({ ccy, ...v });
    }
    if (mapping.price != null) {
      const v = parseMoney(rowCells(r, mapping.price));
      const ccy = String(rowCells(r, mapping.currency)).trim().toUpperCase();
      if (v.kind !== 'none') hits.push({ ccy: CURRENCIES.includes(ccy) ? ccy : null, ...v });
    }
    if (hits.length) {
      const h = hits.find((x) => x.kind === 'price') || hits[0];
      price = h.amount; currency = h.ccy; freeTrial = h.kind === 'free';
      if (hits.filter((x) => x.kind === 'price').length > 1) warnings.push('Price in more than one currency column — used the first');
    } else {
      warnings.push('No price in any currency column — imported at 0');
    }
    const cost = parseMoney(rowCells(r, mapping.productionCost));

    // Customer identity.
    const nameTokens = norm(rawName).split(' ').filter(Boolean);
    let country = null;
    if (nameTokens.length > 1 && COUNTRY_SUFFIX[nameTokens[nameTokens.length - 1]]) {
      country = COUNTRY_SUFFIX[nameTokens.pop()];
    }
    const baseName = rawName ? titleCase(rawName.split(/\s+/).slice(0, nameTokens.length || 1).join(' ')) : '';
    const identifierIsEmail = isEmail(rawIdentifier);
    const identifierIsNote = !identifierIsEmail && rawIdentifier.split(/\s+/).length > 4;
    const identifierIsBlank = !rawIdentifier || NO_IDENTIFIER.has(norm(rawIdentifier));
    const email = identifierIsEmail ? rawIdentifier.toLowerCase() : '';
    const company = !identifierIsEmail && !identifierIsNote && !identifierIsBlank ? rawIdentifier : '';
    if (identifierIsNote) warnings.push(`"${rawIdentifier}" looks like a note, not an email/company — ignored`);
    if (!baseName && !email && !company) errors.push('No customer name or email');
    if (!orderName) warnings.push('No order name');
    if (!designer) errors.push('No designer');

    out.push({
      sheet: sheet.sheetName,
      row: i + 1 + sheet.rowOffset,
      date: parsedDate?.date || null,
      orderName: orderName || 'Order',
      price, currency, freeTrial,
      productionCost: cost.kind === 'price' ? cost.amount : 0,
      designer, salesperson,
      customer: { rawName, baseName, email, company, country },
      errors, warnings
    });
  }
  return out;
}

// ---------- grouping rows into customers ----------
function groupCustomers(rows) {
  const parent = rows.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent[rb] = ra; };
  const firstBy = new Map();
  const link = (key, i) => { if (!key) return; if (firstBy.has(key)) union(firstBy.get(key), i); else firstBy.set(key, i); };

  rows.forEach((r, i) => {
    if (r.errors.includes('No customer name or email')) return;
    const c = r.customer;
    const nm = compact(c.baseName);
    if (c.email) {
      link(`email:${c.email}`, i);
      const [local, domain] = c.email.split('@');
      if (local.length >= 6) link(`compact:${compact(local)}`, i);
      // Same person at the same company domain (grace@ / jodie@dennys.co.uk).
      if (!GENERIC_DOMAINS.has(domain) && nm) link(`namedomain:${nm}@${domain}`, i);
    }
    if (c.company) {
      link(`company:${compact(c.company)}`, i);
      if (compact(c.company).length >= 6) link(`compact:${compact(c.company)}`, i);
    }
    if (!c.email && !c.company && nm) link(`name:${nm}`, i);
  });

  const groups = new Map();
  rows.forEach((r, i) => {
    if (r.errors.includes('No customer name or email')) return;
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(r);
  });
  return [...groups.values()];
}

const mostCommon = (values) => {
  const counts = new Map();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
};

function describeGroup(rows, index) {
  const names = rows.map((r) => r.customer.baseName).filter(Boolean);
  const emails = [...new Set(rows.map((r) => r.customer.email).filter(Boolean))];
  const companies = rows.map((r) => r.customer.company).filter(Boolean);
  const contact = mostCommon(names) || '';
  const companyText = mostCommon(companies);
  const emailDomain = emails[0]?.split('@')[1];
  const company = companyText
    || (emailDomain && !GENERIC_DOMAINS.has(emailDomain) ? titleCase(emailDomain.split('.')[0]) : '')
    || contact || emails[0];
  const currency = mostCommon(rows.map((r) => r.currency)) || null;
  const country = mostCommon(rows.map((r) => r.customer.country)) || (currency ? CURRENCY_COUNTRY[currency] : null) || 'United States';
  return {
    key: `g${index}`,
    contact: contact || company,
    company,
    email: emails[0] || '',
    otherEmails: emails.slice(1),
    country,
    currency: currency || Object.entries(CURRENCY_COUNTRY).find(([, c]) => c === country)?.[0] || 'USD',
    customerType: rows.some((r) => !r.freeTrial && r.price > 0) ? 'Paid' : 'Free Trial',
    variants: [...new Set(rows.map((r) => [r.customer.rawName, r.customer.email || r.customer.company].filter(Boolean).join(' · ')))],
    rows: rows.map((r) => `${r.sheet}!${r.row}`),
    orderCount: rows.length
  };
}

// ---------- matching to existing records ----------
async function matchExisting(groups, rows) {
  const customers = await prisma.customer.findMany({ select: { id: true, company: true, name: true, email: true, customerCode: true, currency: true } });
  const byEmail = new Map(customers.filter((c) => c.email).map((c) => [c.email.toLowerCase(), c]));
  const byCompact = new Map();
  customers.forEach((c) => {
    [c.company, c.email && c.email.split('@')[0]].filter((x) => x && compact(x).length >= 4).forEach((x) => byCompact.set(compact(x), c));
  });
  for (const g of groups) {
    const hit = (g.email && byEmail.get(g.email))
      || g.otherEmails.map((e) => byEmail.get(e)).find(Boolean)
      || byCompact.get(compact(g.company))
      || (g.email ? byCompact.get(compact(g.email.split('@')[0])) : null);
    g.match = hit ? { id: hit.id, label: `${hit.company} (${hit.customerCode || `#${hit.id}`})`, currency: hit.currency } : null;
  }

  const employees = await prisma.employee.findMany({ select: { id: true, name: true, role: true } });
  const people = (field, role) => [...new Set(rows.map((r) => r[field]).filter(Boolean))].map((name) => {
    const same = employees.filter((e) => norm(e.name) === norm(name));
    const hit = same.find((e) => e.role === role) || same[0];
    return { name, match: hit ? { id: hit.id, label: `${hit.name} (${hit.role})` } : null, orderCount: rows.filter((r) => r[field] === name).length };
  });
  return { designers: people('designer', 'Designer'), salespeople: people('salesperson', 'Salesperson') };
}

// ---------- preview ----------
async function buildPlan(buffer, options = {}) {
  const sheets = readSheets(buffer, options);
  if (!sheets.length) {
    const err = new Error("Couldn't find a header row (e.g. Date, Name, Email, Design Name…) in this file.");
    err.status = 400;
    throw err;
  }
  // Default year: the year real date cells carry, else the current year.
  let year = Number(options.year) || null;
  const rows = [];
  for (const sheet of sheets) {
    const { mapping, priceColumns } = options.mapping?.[sheet.sheetName]
      ? options.mapping[sheet.sheetName]
      : guessMapping(sheet.header);
    if (!year) {
      const cellYears = sheet.rows.slice(sheet.headerIdx + 1).map((r) => (typeof r[mapping.date] === 'number' && r[mapping.date] > 1000 ? fromSerial(r[mapping.date]).getUTCFullYear() : null)).filter(Boolean);
      year = sheet.title.year || mostCommon(cellYears) || new Date().getUTCFullYear();
    }
    sheet.mapping = mapping;
    sheet.priceColumns = priceColumns;
    rows.push(...parseSheetRows(sheet, mapping, priceColumns, year));
  }

  const groups = groupCustomers(rows).map((g, i) => {
    const d = describeGroup(g, i);
    g.forEach((r) => { r.groupKey = d.key; });
    return d;
  });
  const { designers, salespeople } = await matchExisting(groups, rows);
  return {
    year,
    sheets: sheets.map((s) => ({
      name: s.sheetName,
      title: s.title,
      header: s.header,
      // Keep indexes in the preview response so the wizard can show and edit
      // the detected mapping, then send the same shape back for import.
      mapping: s.mapping,
      priceColumnIndexes: s.priceColumns,
      columns: Object.fromEntries(Object.entries(s.mapping).map(([f, idx]) => [FIELD_LABELS[f], s.header[idx]])),
      priceColumns: Object.fromEntries(Object.entries(s.priceColumns).map(([ccy, idx]) => [ccy, s.header[idx]]))
    })),
    rows,
    customers: groups,
    designers,
    salespeople,
    totals: rows.filter((r) => !r.errors.length).reduce((acc, r) => {
      if (r.currency) acc[r.currency] = Math.round(((acc[r.currency] || 0) + r.price) * 100) / 100;
      return acc;
    }, {})
  };
}

// ---------- import ----------
// decisions.customers[key] = { action: 'link', customerId } | { action: 'create', company, contact, email, country, currency }
// decisions.designers[name] / decisions.salespeople[name] = { action: 'link', employeeId } | { action: 'create' }
// options.historical (default true): completed, already billed, commission & production cost already paid.
async function runImport(buffer, fileName, options = {}, decisions = {}) {
  const plan = await buildPlan(buffer, options);
  const historical = options.historical !== false;
  const defaultCcy = await getDefaultCurrency(prisma);
  const importable = plan.rows.filter((r) => !r.errors.length);
  const skipped = plan.rows.filter((r) => r.errors.length).map((r) => ({ row: `${r.sheet}!${r.row}`, reason: r.errors.join('; ') }));

  return prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({ data: { fileName } });
    const created = { customers: 0, designers: 0, salespeople: 0 };

    // People first (orders need a designer; customers may need a salesperson).
    const personIds = {};
    for (const [kind, role, list] of [['designers', 'Designer', plan.designers], ['salespeople', 'Salesperson', plan.salespeople]]) {
      personIds[kind] = {};
      for (const p of list) {
        const d = decisions[kind]?.[p.name];
        if (d?.action === 'link' && d.employeeId) { personIds[kind][p.name] = Number(d.employeeId); continue; }
        if (!d && p.match) { personIds[kind][p.name] = p.match.id; continue; }
        const emp = await tx.employee.create({
          data: { name: p.name, role, currency: defaultCcy, baseSalary: 0, payoutDay: 1, slipPrefix: generateSlipPrefix(p.name), importBatchId: batch.id }
        });
        personIds[kind][p.name] = emp.id;
        created[kind] += 1;
      }
    }
    const employees = await tx.employee.findMany({ where: { id: { in: Object.values(personIds.salespeople) } }, select: { id: true, commissionRate: true } });
    const salesRate = new Map(employees.map((e) => [e.id, e.commissionRate]));

    // Customers.
    const counter = await tx.counter.findUnique({ where: { id: 1 } });
    let nextCode = counter?.nextCustomerCode || 1001;
    const customerIds = {};
    const customerSalesperson = {};
    for (const g of plan.customers) {
      const d = decisions.customers?.[g.key] || (g.match ? { action: 'link', customerId: g.match.id } : { action: 'create' });
      const groupRows = importable.filter((r) => r.groupKey === g.key);
      const spName = mostCommon(groupRows.map((r) => r.salesperson));
      const spId = spName ? personIds.salespeople[spName] : null;
      if (d.action === 'link' && d.customerId) {
        customerIds[g.key] = Number(d.customerId);
        const existing = await tx.customer.findUnique({ where: { id: Number(d.customerId) }, select: { salespersonId: true } });
        customerSalesperson[g.key] = existing?.salespersonId || null;
        continue;
      }
      if (!groupRows.length) continue;
      while (await tx.customer.findUnique({ where: { customerCode: `CUST-${nextCode}` } })) nextCode += 1;
      const company = String(d.company || g.company || g.contact).trim();
      const contact = String(d.contact || g.contact || company).trim();
      const customer = await tx.customer.create({
        data: {
          customerCode: `CUST-${nextCode}`,
          name: contact,
          company,
          country: d.country || g.country,
          currency: d.currency || g.currency,
          email: d.email ?? g.email ?? '',
          emailClient: 'Gmail',
          contact: '',
          salespersonId: spId,
          status: g.customerType,
          notes: g.otherEmails.length ? `Also used: ${g.otherEmails.join(', ')}` : '',
          invoicePrefix: generateInvoicePrefix(company, contact),
          importBatchId: batch.id
        }
      });
      nextCode += 1;
      customerIds[g.key] = customer.id;
      customerSalesperson[g.key] = spId;
      created.customers += 1;
    }
    if (counter) await tx.counter.update({ where: { id: 1 }, data: { nextCustomerCode: Math.max(counter.nextCustomerCode, nextCode) } });

    // Orders (skipping exact duplicates of orders already in the app).
    const linkedIds = [...new Set(Object.values(customerIds))];
    const existingOrders = linkedIds.length
      ? await tx.order.findMany({ where: { customerId: { in: linkedIds } }, select: { customerId: true, date: true, name: true, price: true, currency: true } })
      : [];
    const seen = new Set(existingOrders.map((o) => `${o.customerId}|${o.date.toISOString().slice(0, 10)}|${norm(o.name)}|${o.price}|${o.currency}`));
    const toCreate = [];
    let duplicates = 0;
    for (const r of importable) {
      const customerId = customerIds[r.groupKey];
      if (!customerId) continue;
      const group = plan.customers.find((g) => g.key === r.groupKey);
      const currency = r.currency || group.currency;
      const key = `${customerId}|${r.date}|${norm(r.orderName)}|${r.price}|${currency}`;
      // Only orders already in the app count as duplicates — two identical
      // rows in the sheet are two real orders.
      if (seen.has(key)) { duplicates += 1; continue; }
      const spId = customerSalesperson[r.groupKey];
      toCreate.push({
        customerId,
        name: r.orderName,
        date: new Date(`${r.date}T00:00:00.000Z`),
        price: r.price,
        currency,
        designerId: personIds.designers[r.designer],
        productionCost: r.productionCost,
        productionCostCurrency: defaultCcy,
        commissionRate: spId ? (salesRate.get(spId) ?? 10) : 10,
        status: 'Completed',
        externallyBilled: historical,
        commissionPaid: historical,
        productionPaid: historical,
        importBatchId: batch.id
      });
    }
    if (toCreate.length) await tx.order.createMany({ data: toCreate });

    const summary = { orders: toCreate.length, duplicates, skipped: skipped.length, ...created, historical };
    await tx.importBatch.update({ where: { id: batch.id }, data: { summary } });
    return { batchId: batch.id, ...summary, skippedRows: skipped };
  }, { timeout: 120000, maxWait: 20000 });
}

// ---------- undo ----------
// Removes the batch's orders, then the customers/employees it created that
// nothing else uses any more.
async function undoBatch(batchId) {
  const id = Number(batchId);
  return prisma.$transaction(async (tx) => {
    const orders = await tx.order.deleteMany({ where: { importBatchId: id, invoiceId: null } });
    const customers = await tx.customer.deleteMany({ where: { importBatchId: id, orders: { none: {} }, invoices: { none: {} } } });
    const employees = await tx.employee.deleteMany({
      where: { importBatchId: id, designedOrders: { none: {} }, customers: { none: {} }, payslips: { none: {} }, user: null }
    });
    await tx.importBatch.delete({ where: { id } });
    return { orders: orders.count, customers: customers.count, employees: employees.count };
  }, { timeout: 60000 });
}

async function listBatches() {
  const batches = await prisma.importBatch.findMany({ orderBy: { id: 'desc' }, take: 20 });
  return batches.map((b) => ({ id: b.id, fileName: b.fileName, createdAt: b.createdAt, summary: b.summary }));
}

module.exports = { buildPlan, runImport, undoBatch, listBatches };
