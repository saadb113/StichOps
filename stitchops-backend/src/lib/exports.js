// Excel exports for the Orders, Invoices, Customers and Employees screens.
// Each uses the SAME filtering as the on-screen list (lib/listQueries.js),
// but returns every matching row — not just the visible page — with only
// human-useful columns (no internal ids or relation data).

const XLSX = require('xlsx');
const prisma = require('./prisma');
const { listOrders, listInvoices, listCustomers } = require('./listQueries');
const { employeeSearchIds } = require('./summaries');
const { getDefaultCurrency } = require('./currency');
const { parseDateOnly, today } = require('./date');

const DAY_MS = 86400000;
const yesNo = (v) => (v ? 'Yes' : 'No');
// Real Excel dates (sortable/filterable), displayed as "02 Oct 2026".
const asDate = (s) => (s ? parseDateOnly(String(s).slice(0, 10)) : '');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function toWorkbook(sheetName, header, rows) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows], { cellDates: true, dateNF: 'dd mmm yyyy' });
  // Reasonable column widths from the header/content length.
  ws['!cols'] = header.map((h, i) => ({
    wch: Math.min(40, Math.max(String(h).length, ...rows.slice(0, 200).map((r) => (r[i] instanceof Date ? 11 : String(r[i] ?? '').length))) + 2)
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellDates: true });
}

// ---------- orders ----------
async function exportOrders(query, user) {
  const { items, related } = await listOrders(query, user, { all: true });
  const customers = new Map(related.customers.map((c) => [c.id, c]));
  const invoiceRows = items.length
    ? await prisma.order.findMany({ where: { id: { in: items.map((o) => o.id) } }, select: { id: true, invoice: { select: { invoiceNo: true } } } })
    : [];
  const invoiceNo = new Map(invoiceRows.map((r) => [r.id, r.invoice?.invoiceNo || '']));

  const header = ['Order Date', 'Order', 'Customer', 'Contact', 'Salesperson', 'Designer', 'Status', 'Currency', 'Price',
    'Commission %', 'Production Cost', 'Production Currency', 'Invoiced', 'Invoice No.', 'Commission Paid', 'Production Paid'];
  const rows = items.map((o) => {
    const c = customers.get(o.customerId);
    return [asDate(o.date), o.name, c?.company || '', c?.name || '', c?.salesperson || '', o.designer, o.status, o.currency, round2(o.price),
      o.commissionRate, round2(o.productionCost), o.productionCostCurrency, yesNo(o.invoiced), invoiceNo.get(o.id) || '',
      yesNo(o.commissionPaid), yesNo(o.productionPaid)];
  });
  return toWorkbook('Orders', header, rows);
}

// ---------- invoices ----------
// Same wording as the Invoices screen's payment badge.
function paymentStatus(inv) {
  if (inv.paymentStatus === 'Completed') return 'Paid';
  const days = Math.floor((parseDateOnly(today()) - parseDateOnly(inv.approvedDate || inv.generatedDate)) / DAY_MS);
  const months = Math.floor(days / 30);
  if (months >= 2) return `${months} months overdue`;
  if (months >= 1) return '1 month overdue';
  return 'Pending';
}

async function exportInvoices(query) {
  const { items, related } = await listInvoices(query, { all: true });
  const customers = new Map(related.customers.map((c) => [c.id, c]));
  const bankIds = [...new Set(items.map((i) => i.bankAccountId).filter(Boolean))];
  const banks = new Map((bankIds.length ? await prisma.bankAccount.findMany({ where: { id: { in: bankIds } } }) : []).map((b) => [b.id, b.accountName]));

  const header = ['Invoice No.', 'Customer', 'Customer ID', 'Salesperson', 'Generated', 'Currency', 'Total', 'Orders', 'Payment Status', 'Bank Account'];
  const rows = items.map((i) => {
    const c = customers.get(i.customerId);
    return [i.invoiceNo, c?.company || '', c?.customerCode || '', c?.salesperson || '', asDate(i.generatedDate), i.currency, round2(i.total),
      i.orderIds.length, paymentStatus(i), banks.get(i.bankAccountId) || ''];
  });
  return toWorkbook('Invoices', header, rows);
}

// ---------- customers ----------
async function exportCustomers(query, user) {
  const { items } = await listCustomers(query, user, { all: true });
  const ids = items.map((c) => c.id);
  const [orderStats, unpaid] = ids.length ? await Promise.all([
    prisma.order.groupBy({ by: ['customerId'], where: { customerId: { in: ids } }, _count: { _all: true }, _max: { date: true } }),
    prisma.invoice.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, paymentStatus: { not: 'Completed' } }, _count: { _all: true } })
  ]) : [[], []];
  const orders = new Map(orderStats.map((r) => [r.customerId, r]));
  const unpaidCount = new Map(unpaid.map((r) => [r.customerId, r._count._all]));

  const header = ['Customer ID', 'Company', 'Contact', 'Email', 'Phone', 'Country', 'Address', 'Currency', 'Customer Type', 'Status',
    'Salesperson', 'Received Via', 'Total Orders', 'Last Order', 'Unpaid Invoices', 'Added On'];
  const rows = items.map((c) => {
    const o = orders.get(c.id);
    return [c.customerCode || '', c.company, c.name, c.email || '', c.contact || '', c.country, c.address || '', c.currency, c.status,
      c.active ? 'Active' : 'Inactive', c.salesperson || '', c.receivedEmail || '', o?._count._all || 0,
      o?._max.date ? o._max.date : '', unpaidCount.get(c.id) || 0, c.createdAt ? new Date(c.createdAt) : ''];
  });
  return toWorkbook('Customers', header, rows);
}

// ---------- employees ----------
// Unpaid earnings: completed orders whose commission (salespeople) or
// production cost (designers) hasn't been paid out — same rule as the
// Employees screen — converted to the company's default currency.
async function exportEmployees(query) {
  const role = query.category ? String(query.category) : 'Salesperson';
  const ids = query.search && String(query.search).trim() ? await employeeSearchIds(query.search) : null;
  const employees = await prisma.employee.findMany({ where: { role, ...(ids ? { id: { in: ids } } : {}) }, orderBy: { id: 'asc' } });
  const empIds = employees.map((e) => e.id);
  const defaultCcy = await getDefaultCurrency(prisma);

  const [customerCounts, unpaidOrders] = empIds.length ? await Promise.all([
    prisma.customer.groupBy({ by: ['salespersonId'], where: { salespersonId: { in: empIds } }, _count: { _all: true } }),
    prisma.order.findMany({
      where: { status: 'Completed', OR: [{ commissionPaid: false, customer: { salespersonId: { in: empIds } } }, { productionPaid: false, designerId: { in: empIds } }] },
      select: { price: true, currency: true, commissionRate: true, commissionPaid: true, productionCost: true, productionCostCurrency: true, productionPaid: true, designerId: true, customer: { select: { salespersonId: true } } }
    })
  ]) : [[], []];
  const customers = new Map(customerCounts.map((r) => [r.salespersonId, r._count._all]));
  // Rates loaded once (same rule as convertToDefaultCurrency, without a
  // database round trip per order).
  const rates = new Map((await prisma.currencyRate.findMany()).map((r) => [r.currency, r.rate]));
  const toDefault = (amount, ccy) => (ccy === defaultCcy ? amount : rates.has(ccy) ? amount * rates.get(ccy) : amount);

  const unpaidByEmp = new Map();
  for (const e of employees) {
    let total = 0;
    for (const o of unpaidOrders) {
      if (e.role === 'Salesperson' && o.customer.salespersonId === e.id && !o.commissionPaid) {
        total += toDefault(o.price * (o.commissionRate / 100), o.currency);
      } else if (e.role !== 'Salesperson' && o.designerId === e.id && !o.productionPaid) {
        total += toDefault(o.productionCost, o.productionCostCurrency || o.currency);
      }
    }
    unpaidByEmp.set(e.id, round2(total));
  }

  const header = ['Name', 'Team', 'Designation', 'Email', 'Phone', 'Pay Currency', 'Base Salary', 'Payout Day', 'Commission %', 'Customers', `Unpaid Earnings (${defaultCcy})`];
  const rows = employees.map((e) => [e.name, e.role, e.designation || '', e.email || '', e.contact || '', e.currency, round2(e.baseSalary),
    e.payoutDay, e.role === 'Salesperson' ? e.commissionRate : '', e.role === 'Salesperson' ? (customers.get(e.id) || 0) : '', unpaidByEmp.get(e.id) || 0]);
  return toWorkbook('Employees', header, rows);
}

module.exports = { exportOrders, exportInvoices, exportCustomers, exportEmployees };
