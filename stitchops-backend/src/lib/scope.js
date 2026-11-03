// "Just the records this screen needs" — used by screens that work on a
// slice of the data (one customer's profile, one employee's profile, a
// Reports date range…) so the browser no longer downloads every order,
// customer, invoice and payslip at login.
//
// Filters (all optional, combined with AND within each collection):
//   customerId                 one customer + their orders + their invoices
//   employeeId                 a salesperson's customers + those customers' orders,
//                              or a designer's orders; plus the employee's payslips
//   orderFrom / orderTo        orders dated within the range
//   invoiceFrom / invoiceTo    invoices generated within the range
//   payslipFrom / payslipTo    payslips approved within the range
//   unpaidEarnings=1           completed orders whose commission or production
//                              cost hasn't been paid out yet
//   collections                comma list of what to return (orders,invoices,payslips)
//   all=1                      allow a collection with no filter (= every record);
//                              otherwise an unfiltered collection comes back empty
//                              so a missing filter can never download everything
// Customers referenced by any returned order/invoice are always included, so
// screens can still look up names, currencies and salespeople.

const prisma = require('./prisma');
const { orderInclude, invoiceInclude, customerInclude, payslipInclude } = require('./includes');
const { serializeOrder, serializeInvoice, serializeCustomer, serializePayslip } = require('./serialize');
const { parseDateOnly } = require('./date');

const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const and = (...parts) => ({ AND: parts.filter(Boolean) });
// null when no valid dates were given, so it doesn't count as a filter.
const range = (field, from, to) => (validDate(from) || validDate(to) ? and(
  validDate(from) ? { [field]: { gte: parseDateOnly(from) } } : null,
  validDate(to) ? { [field]: { lte: parseDateOnly(to) } } : null
) : null);

async function loadScope(q) {
  const want = new Set(String(q.collections || 'orders,invoices,payslips').split(',').map((s) => s.trim()));
  const customerId = Number(q.customerId) || null;
  const employeeId = Number(q.employeeId) || null;

  let employee = null;
  if (employeeId) employee = await prisma.employee.findUnique({ where: { id: employeeId } });

  const orderWhere = and(
    customerId ? { customerId } : null,
    employee ? (employee.role === 'Salesperson' ? { customer: { salespersonId: employee.id } } : { designerId: employee.id }) : null,
    range('date', q.orderFrom, q.orderTo),
    q.unpaidEarnings === '1' ? { status: 'Completed', OR: [{ commissionPaid: false }, { productionPaid: false }] } : null
  );
  const invoiceWhere = and(customerId ? { customerId } : null, range('generatedDate', q.invoiceFrom, q.invoiceTo));
  const payslipWhere = and(employeeId ? { employeeId } : null, range('approvedDate', q.payslipFrom, q.payslipTo));
  const all = q.all === '1';
  const filtered = (where) => all || where.AND.length > 0;

  const [orders, invoices, payslips, ownCustomers] = await Promise.all([
    want.has('orders') && filtered(orderWhere) ? prisma.order.findMany({ where: orderWhere, include: orderInclude, orderBy: [{ date: 'desc' }, { id: 'desc' }] }) : [],
    want.has('invoices') && filtered(invoiceWhere) ? prisma.invoice.findMany({ where: invoiceWhere, include: invoiceInclude, orderBy: { id: 'desc' } }) : [],
    want.has('payslips') && filtered(payslipWhere) ? prisma.payslip.findMany({ where: payslipWhere, include: payslipInclude, orderBy: { id: 'desc' } }) : [],
    // The customer being viewed, or every customer a salesperson owns —
    // included even when they have no orders yet.
    customerId || employee?.role === 'Salesperson'
      ? prisma.customer.findMany({ where: customerId ? { id: customerId } : { salespersonId: employee.id }, include: customerInclude, orderBy: { id: 'asc' } })
      : []
  ]);

  const have = new Set(ownCustomers.map((c) => c.id));
  const missing = [...new Set([...orders.map((o) => o.customerId), ...invoices.map((i) => i.customerId)])].filter((id) => !have.has(id));
  const referenced = missing.length
    ? await prisma.customer.findMany({ where: { id: { in: missing } }, include: customerInclude })
    : [];

  return {
    customers: [...ownCustomers, ...referenced].sort((a, b) => a.id - b.id).map(serializeCustomer),
    orders: orders.map(serializeOrder),
    invoices: invoices.map(serializeInvoice),
    payslips: payslips.map(serializePayslip)
  };
}

module.exports = { loadScope };
