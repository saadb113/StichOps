const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const XLSX = require('xlsx');

function harness() {
  let orders = [], customers = [], employees = [], batches = [];
  let id = 0;
  const db = {
    customer: {
      findMany: async () => customers,
      findUnique: async ({ where }) => customers.find(c => Object.entries(where).every(([k,v]) => c[k] === v)) || null,
      create: async ({ data }) => { const c = { id: ++id, ...data }; customers.push(c); return c; },
      deleteMany: async ({ where }) => { const before = customers.length; customers = customers.filter(c => c.importBatchId !== where.importBatchId || orders.some(o => o.customerId === c.id)); return { count: before - customers.length }; }
    },
    employee: {
      findMany: async () => employees,
      create: async ({ data }) => { const e = { id: ++id, ...data }; employees.push(e); return e; },
      deleteMany: async ({ where }) => { const before = employees.length; employees = employees.filter(e => e.importBatchId !== where.importBatchId || orders.some(o => o.designerId === e.id)); return { count: before - employees.length }; }
    },
    order: {
      findMany: async () => orders,
      createMany: async ({ data }) => { orders.push(...data); },
      deleteMany: async ({ where }) => { const before = orders.length; orders = orders.filter(o => o.importBatchId !== where.importBatchId || o.invoiceId); return { count: before - orders.length }; }
    },
    counter: { findUnique: async () => ({ nextCustomerCode: 1001 }), update: async () => {} },
    importBatch: {
      create: async ({ data }) => { const b = { id: ++id, ...data }; batches.push(b); return b; },
      update: async () => {},
      delete: async ({ where }) => { batches = batches.filter(b => b.id !== where.id); }
    }
  };
  db.$transaction = fn => fn(db);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/lib/legacyImport.js'), 'utf8'), {
    module, require: name => name === 'xlsx' ? XLSX : name === './prisma' ? db :
      name === './currency' ? { getDefaultCurrency: async () => 'PKR' } :
      name === './invoiceNumber' ? { generateInvoicePrefix: () => 'TEST' } : { generateSlipPrefix: () => 'TEST' }
  });
  return { ...module.exports, orders: () => orders };
}

function workbook() {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Month Of September'], [],
    ['Date', 'Name', 'Email', 'Design Name', 'USD', 'Designer Name', 'payment'],
    ['1 Sep', 'Client us', 'client@example.com', 'Logo', '$8', 'Designer', 400],
    ['2 Sep', 'Client us', 'client@example.com', 'Trial', 'free trail', 'Designer', '-'],
    ['', '', '', 'Total Designs 2', '$8']
  ], { origin: 'A3' });
  const w = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w, sheet, 'September');
  return XLSX.write(w, { type: 'buffer', bookType: 'xlsx' });
}

test('detect headers below title, preserve worksheet row numbers, skip totals', async () => {
  const p = await harness().buildPlan(workbook(), { year: 2023 });
  assert.equal(p.rows.length, 2);
  assert.equal(p.rows[0].row, 6);
  assert.equal(p.rows[0].date, '2023-09-01');
  assert.equal(p.rows[1].freeTrial, true);
  assert.equal(p.customers.length, 1);
  assert.equal(p.totals.USD, 8);
});

test('manual mapping and year are honored by preview', async () => {
  const h = harness(), p = await h.buildPlan(workbook(), { year: 2023 });
  const mapping = { September: { mapping: { ...p.sheets[0].mapping, designer: null }, priceColumns: p.sheets[0].priceColumnIndexes } };
  const changed = await h.buildPlan(workbook(), { year: 2022, mapping });
  assert.equal(changed.rows[0].date, '2022-09-01');
  assert.ok(changed.rows.every(r => r.errors.includes('No designer')));
});

test('historical import, duplicate reupload, and undo use batch ownership', async () => {
  const h = harness();
  const first = await h.runImport(workbook(), 'test.xlsx', { year: 2023 });
  assert.equal(first.orders, 2);
  assert.ok(h.orders().every(o => o.externallyBilled && o.commissionPaid && o.productionPaid));
  const second = await h.runImport(workbook(), 'test.xlsx', { year: 2023 });
  assert.equal(second.orders, 0); assert.equal(second.duplicates, 2);
  const undone = await h.undoBatch(first.batchId);
  assert.equal(undone.orders, 2); assert.equal(h.orders().length, 0);
});

test('nonhistorical orders remain eligible for billing', async () => {
  const h = harness(); await h.runImport(workbook(), 'test.xlsx', { year: 2023, historical: false });
  assert.ok(h.orders().every(o => !o.externallyBilled && !o.commissionPaid && !o.productionPaid));
});

test('client sample parses without importing into the database', { skip: !process.env.IMPORT_SAMPLE }, async () => {
  const p = await harness().buildPlan(fs.readFileSync(process.env.IMPORT_SAMPLE), { year: 2023 });
  assert.equal(p.rows.length, 53);
  assert.equal(p.rows.filter(r => !r.errors.length).length, 52);
  assert.equal(p.rows.find(r => r.errors.length).row, 24);
});
