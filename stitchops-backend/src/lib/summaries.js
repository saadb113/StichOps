// Small server-side answers that used to need every order/customer/invoice
// in the browser: global search, the pending-orders badge, and the Dashboard.

const prisma = require('./prisma');
const { orderInclude, invoiceInclude, customerInclude } = require('./includes');
const { serializeOrder, serializeInvoice, serializeCustomer } = require('./serialize');
const { parseDateOnly, today } = require('./date');
const { searchIds } = require('./listQueries');

const DAY_MS = 86400000;
const PER_GROUP = 5;
const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const and = (...parts) => ({ AND: parts.filter(Boolean) });

// ---------- global search ----------
// Same groups, matching rule (start of any word) and 5-per-group limit as
// the search panel used to compute in the browser. `tag` limits it to one
// group; a tag with no query lists that group's first 5.
async function globalSearch(query, user) {
  const q = String(query.q || '');
  const tag = ['customers', 'employees', 'invoices', 'orders'].includes(query.tag) ? query.tag : null;
  if (!q.trim() && !tag) return { groups: [] };
  const isAdmin = user.role === 'ADMIN';
  const salesScope = isAdmin ? null : user.employeeId;
  const wants = (k) => !tag || tag === k;
  const idFilter = async (kind) => {
    const ids = q.trim() ? await searchIds(kind, q) : null;
    return ids ? { id: { in: ids } } : null;
  };

  // Each group is independent, so all four run in parallel (the database is
  // a network hop away — sequential queries would add up quickly).
  const tasks = [];
  if (wants('customers')) {
    tasks.push((async () => {
      const rows = await prisma.customer.findMany({
        where: and(await idFilter('customers'), salesScope ? { salespersonId: salesScope } : null),
        orderBy: { id: 'asc' },
        take: PER_GROUP,
        include: customerInclude
      });
      return { key: 'customers', items: rows.map(serializeCustomer) };
    })());
  }
  if (wants('employees') && isAdmin) {
    tasks.push((async () => {
      const ids = q.trim() ? await employeeSearchIds(q) : null;
      const rows = await prisma.employee.findMany({ where: ids ? { id: { in: ids } } : {}, orderBy: { id: 'asc' }, take: PER_GROUP });
      return { key: 'employees', items: rows.map((e) => ({ id: e.id, name: e.name, role: e.role, designation: e.designation || '' })) };
    })());
  }
  if (wants('invoices') && isAdmin) {
    tasks.push((async () => {
      const rows = await prisma.invoice.findMany({
        where: (await idFilter('invoices')) || {},
        orderBy: { id: 'desc' },
        take: PER_GROUP,
        include: { ...invoiceInclude, customer: { select: { company: true } } }
      });
      return { key: 'invoices', items: rows.map((i) => ({ ...serializeInvoice(i), customerCompany: i.customer.company })) };
    })());
  }
  if (wants('orders')) {
    tasks.push((async () => {
      const rows = await prisma.order.findMany({
        where: and(await idFilter('orders'), salesScope ? { customer: { salespersonId: salesScope } } : null),
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: PER_GROUP,
        include: { ...orderInclude, customer: { select: { company: true } } }
      });
      return { key: 'orders', items: rows.map((o) => ({ ...serializeOrder(o), customerCompany: o.customer.company })) };
    })());
  }
  const groups = await Promise.all(tasks);
  return { groups: groups.filter((g) => g.items.length) };
}

// Employees: name, designation or email — same word-start rule.
async function employeeSearchIds(rawQuery) {
  const q = String(rawQuery).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!q) return null;
  const norm = (col) => `(' ' || trim(regexp_replace(lower(coalesce(${col}, '')), '[^a-z0-9]+', ' ', 'g')))`;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id FROM "Employee" WHERE ${['name', 'designation', 'email'].map((c) => `${norm(c)} LIKE $1`).join(' OR ')}`,
    `% ${q}%`
  );
  return rows.map((r) => Number(r.id));
}

// ---------- pending orders badge ----------
async function pendingOrderCount(user) {
  const scope = user.role === 'SALESPERSON' ? { customer: { salespersonId: user.employeeId } } : null;
  return prisma.order.count({ where: and(scope, { status: { in: ['Pending', 'Rush'] } }) });
}

// ---------- dashboard ----------
async function dashboardSummary(query) {
  const from = validDate(query.from) ? query.from : '';
  const to = validDate(query.to) ? query.to : '';
  // Mid-selection the range can be missing an end — fall back like the page did.
  const refDate = to || from || today();
  const rangeWhere = and(
    from ? { date: { gte: parseDateOnly(from) } } : null,
    { date: { lte: parseDateOnly(to || refDate) } }
  );
  // Active = an order within 15 days of the reference date (or later).
  const activeCutoff = new Date(parseDateOnly(refDate).getTime() - 15 * DAY_MS);
  const overdueCutoff = new Date(parseDateOnly(today()).getTime() - 30 * DAY_MS);

  const [rangeOrders, rangeTotals, totalCustomers, activeCustomers, readyToInvoice, overdue, recent] = await Promise.all([
    prisma.order.count({ where: rangeWhere }),
    prisma.order.groupBy({ by: ['currency'], where: rangeWhere, _sum: { price: true } }),
    prisma.customer.count(),
    prisma.customer.count({ where: { orders: { some: { date: { gte: activeCutoff } } } } }),
    prisma.order.count({ where: { invoiceId: null, externallyBilled: false, status: 'Completed' } }),
    prisma.invoice.findMany({
      where: { paymentStatus: { not: 'Completed' }, approvedDate: { lte: overdueCutoff } },
      orderBy: { id: 'desc' },
      include: { ...invoiceInclude, customer: { select: { company: true } } }
    }),
    prisma.order.findMany({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: 7,
      include: { ...orderInclude, customer: { select: { company: true, name: true } } }
    })
  ]);

  return {
    rangeOrders,
    rangeTotals: Object.fromEntries(rangeTotals.map((r) => [r.currency, r._sum.price || 0])),
    totalCustomers,
    activeCustomers,
    readyToInvoice,
    overdueInvoices: overdue.map((i) => ({ ...serializeInvoice(i), customerCompany: i.customer.company })),
    recentOrders: recent.map((o) => ({ ...serializeOrder(o), customerCompany: o.customer.company, customerName: o.customer.name }))
  };
}

module.exports = { globalSearch, pendingOrderCount, dashboardSummary, employeeSearchIds };
