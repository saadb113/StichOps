// Server-side paging, filtering, sorting and summary stats for the Orders,
// Invoices and Customers screens. Each mirrors the rules the screen used to
// apply in the browser, so results are identical — only the current page of
// rows (plus a few counts) is sent instead of the whole table.

const prisma = require('./prisma');
const { orderInclude, invoiceInclude, customerInclude } = require('./includes');
const { serializeOrder, serializeInvoice, serializeCustomer } = require('./serialize');
const { parseDateOnly, today } = require('./date');

const DAY_MS = 86400000;
const MAX_PAGE_SIZE = 100;

function paging(query) {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.pageSize) || 10));
  const page = Math.max(1, Number(query.page) || 1);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const daysAgo = (n) => new Date(parseDateOnly(today()).getTime() - n * DAY_MS);

// ---------- search ----------
// Same rule as the browser's matchesSearch(): lower-case, punctuation folded
// to spaces, and the query must match the START of a word in any field
// ("cons" finds "Sam Construction LTD").
const normSearch = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const SQL_NORM = (col) => `(' ' || trim(regexp_replace(lower(coalesce(${col}, '')), '[^a-z0-9]+', ' ', 'g')))`;

const SEARCH_SQL = {
  orders: {
    from: '"Order" t JOIN "Customer" c ON c.id = t."customerId" LEFT JOIN "Employee" e ON e.id = c."salespersonId"',
    cols: ['t.name', 'c.company', 'c.name', 'e.name']
  },
  invoices: {
    from: '"Invoice" t JOIN "Customer" c ON c.id = t."customerId" LEFT JOIN "Employee" e ON e.id = c."salespersonId"',
    cols: ['t."invoiceNo"', 'c.company', 'c.name', 'e.name']
  },
  customers: {
    from: '"Customer" t LEFT JOIN "Employee" e ON e.id = t."salespersonId"',
    cols: ['t.name', 't.company', 't."customerCode"', 't.email', 'e.name']
  }
};

// Ids matching the search, or null when there's no search (= no restriction).
async function searchIds(kind, rawQuery) {
  const q = normSearch(rawQuery);
  if (!q) return null;
  const { from, cols } = SEARCH_SQL[kind];
  // `q` only contains [a-z0-9 ] after normSearch, and it's passed as a bound
  // parameter — no SQL injection surface.
  const where = cols.map((c) => `${SQL_NORM(c)} LIKE $1`).join(' OR ');
  const rows = await prisma.$queryRawUnsafe(`SELECT t.id FROM ${from} WHERE ${where}`, `% ${q}%`);
  return rows.map((r) => Number(r.id));
}

// Reads a page out of several consecutively-ordered groups (e.g. Rush, then
// Pending, then everything else), each sorted newest-first by id. Group
// sizes are known up front, so every slice the page needs is fetched in
// parallel — one database round trip however many groups it spans.
async function pageAcrossGroups(model, groups, counts, skip, take, include) {
  const slices = [];
  let groupStart = 0;
  groups.forEach((where, i) => {
    const from = Math.max(skip, groupStart);
    const to = Math.min(skip + take, groupStart + counts[i]);
    if (to > from) slices.push({ where, skip: from - groupStart, take: to - from });
    groupStart += counts[i];
  });
  const parts = await Promise.all(slices.map((sl) => model.findMany({ where: sl.where, orderBy: { id: 'desc' }, skip: sl.skip, take: sl.take, include })));
  return parts.flat();
}

const and = (...parts) => ({ AND: parts.filter(Boolean) });

// Customers referenced by the rows on the current page (for names, currency…).
async function customersFor(ids) {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const rows = await prisma.customer.findMany({ where: { id: { in: unique } }, include: customerInclude });
  return rows.map(serializeCustomer);
}

// ---------- orders ----------
const NEEDS_ATTENTION = ['Pending', 'Rush'];

async function listOrders(query, user) {
  const { page, pageSize, skip } = paging(query);
  const scope = user.role === 'SALESPERSON' ? { customer: { salespersonId: user.employeeId } } : null;
  const ids = await searchIds('orders', query.search);

  // Rush/Pending orders stay visible whatever the date range (the sidebar
  // badge counts them, so the list must never hide them).
  const base = and(
    scope,
    query.currency ? { currency: String(query.currency) } : null,
    validDate(query.from) ? { OR: [{ date: { gte: parseDateOnly(query.from) } }, { status: { in: NEEDS_ATTENTION } }] } : null,
    validDate(query.to) ? { OR: [{ date: { lte: parseDateOnly(query.to) } }, { status: { in: NEEDS_ATTENTION } }] } : null,
    ids ? { id: { in: ids } } : null
  );

  // Cards summarise the filtered set but ignore the status dropdown.
  const byStatus = await prisma.order.groupBy({ by: ['status'], where: base, _count: { _all: true } });
  const n = (s) => byStatus.find((r) => r.status === s)?._count._all || 0;
  const stats = {
    total: byStatus.reduce((a, r) => a + r._count._all, 0),
    rush: n('Rush'),
    pending: n('Pending'),
    onHold: n('On hold'),
    completed: n('Completed')
  };

  // Rush, then Pending, pinned on top; everything else newest-first. The
  // status counts above already give each group's size.
  const status = query.status ? String(query.status) : '';
  const groups = status
    ? [and(base, { status })]
    : [and(base, { status: 'Rush' }), and(base, { status: 'Pending' }), and(base, { status: { notIn: NEEDS_ATTENTION } })];
  const counts = status ? [n(status)] : [stats.rush, stats.pending, stats.total - stats.rush - stats.pending];
  const rows = await pageAcrossGroups(prisma.order, groups, counts, skip, pageSize, orderInclude);
  const total = counts.reduce((a, b) => a + b, 0);
  const related = { customers: await customersFor(rows.map((o) => o.customerId)) };
  return { items: rows.map(serializeOrder), total, page, pageSize, stats, related };
}

// ---------- invoices ----------
// Mirrors paymentBadge(): unpaid invoices are Pending for their first 30
// days, "1 month" overdue from 30 days, "2+ months" from 60.
function invoiceStatusWhere(status) {
  const unpaid = { paymentStatus: { not: 'Completed' } };
  if (status === 'Paid') return { paymentStatus: 'Completed' };
  if (status === 'Pending') return and(unpaid, { approvedDate: { gt: daysAgo(30) } });
  if (status === 'Overdue1') return and(unpaid, { approvedDate: { lte: daysAgo(30), gt: daysAgo(60) } });
  if (status === 'Overdue2') return and(unpaid, { approvedDate: { lte: daysAgo(60) } });
  return null;
}

// Customers whose invoice-notification day is today (a 31 falls on the last
// day of shorter months) — same rule as isInvoiceNotificationDay().
function dueTodayCustomerWhere() {
  const now = parseDateOnly(today());
  const day = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  return { customer: { OR: [{ invoiceDay: day }, ...(day === daysInMonth ? [{ invoiceDay: { gt: daysInMonth } }] : [])] } };
}

async function listInvoices(query) {
  const { page, pageSize, skip } = paging(query);
  const ids = await searchIds('invoices', query.search);

  const base = and(
    query.dueToday === '1' ? dueTodayCustomerWhere() : null,
    validDate(query.from) ? { generatedDate: { gte: parseDateOnly(query.from) } } : null,
    validDate(query.to) ? { generatedDate: { lte: parseDateOnly(query.to) } } : null,
    query.currency ? { currency: String(query.currency) } : null,
    ids ? { id: { in: ids } } : null
  );

  const unpaidBase = and(base, { paymentStatus: { not: 'Completed' } });
  const where = and(base, invoiceStatusWhere(query.status ? String(query.status) : ''));
  const [total, paid, overdue, outstanding, monthRows, rows, listTotal] = await Promise.all([
    prisma.invoice.count({ where: base }),
    prisma.invoice.count({ where: and(base, { paymentStatus: 'Completed' }) }),
    prisma.invoice.count({ where: and(unpaidBase, { approvedDate: { lte: daysAgo(30) } }) }),
    prisma.invoice.groupBy({ by: ['currency'], where: unpaidBase, _sum: { total: true } }),
    // Month quick-filter options: every month that has invoices.
    prisma.$queryRawUnsafe(`SELECT DISTINCT to_char("generatedDate", 'YYYY-MM') AS m FROM "Invoice" ORDER BY m DESC`),
    prisma.invoice.findMany({ where, orderBy: { id: 'desc' }, skip, take: pageSize, include: invoiceInclude }),
    prisma.invoice.count({ where })
  ]);
  const stats = {
    total,
    paid,
    unpaid: total - paid,
    overdue,
    outstandingByCurrency: Object.fromEntries(outstanding.map((r) => [r.currency, r._sum.total || 0]))
  };

  // The page's customers and the orders on its invoices (PDF download, edit).
  const orderIds = [...new Set(rows.flatMap((i) => i.orders.map((o) => o.id)))];
  const [relCustomers, relOrders] = await Promise.all([
    customersFor(rows.map((i) => i.customerId)),
    orderIds.length ? prisma.order.findMany({ where: { id: { in: orderIds } }, include: orderInclude }) : []
  ]);
  return {
    items: rows.map(serializeInvoice),
    total: listTotal,
    page,
    pageSize,
    stats,
    months: monthRows.map((r) => r.m),
    related: { customers: relCustomers, orders: relOrders.map(serializeOrder) }
  };
}

// ---------- customers ----------
// "Active" = has an order dated within the last 15 days (same as isActive()).
const ACTIVE_DAYS = 15;
const activeWhere = () => ({ orders: { some: { date: { gte: daysAgo(ACTIVE_DAYS) } } } });

async function listCustomers(query, user) {
  const { page, pageSize, skip } = paging(query);
  const scope = user.role === 'SALESPERSON' ? { salespersonId: user.employeeId } : null;
  const ids = await searchIds('customers', query.search);
  const salesperson = query.salesperson ? String(query.salesperson) : '';

  const createdTo = validDate(query.to) ? new Date(parseDateOnly(query.to).getTime() + DAY_MS) : null;
  const base = and(
    scope,
    ids ? { id: { in: ids } } : null,
    salesperson ? { salesperson: { name: salesperson } } : null,
    query.customerType ? { status: String(query.customerType) } : null,
    query.country ? { country: String(query.country) } : null,
    validDate(query.from) ? { createdAt: { gte: parseDateOnly(query.from) } } : null,
    createdTo ? { createdAt: { lt: createdTo } } : null
  );

  let statusWhere = null;
  if (query.status === 'Active') statusWhere = activeWhere();
  if (query.status === 'Inactive') {
    const unpaidInvoice = { invoices: { some: { paymentStatus: { not: 'Completed' } } } };
    statusWhere = and(
      { NOT: activeWhere() },
      query.paymentFilter === 'Unpaid' ? unpaidInvoice : null,
      query.paymentFilter === 'Paid' ? { NOT: unpaidInvoice } : null
    );
  }
  const where = and(base, statusWhere);

  // Dropdown options come from the whole (scoped) customer list, not the
  // filtered one, so picking a filter never empties its own dropdown.
  // Everything runs in parallel — one database round trip.
  const [total, active, freeTrial, countryRows, salespersonRows, salespersonCount, allCount, rows, listTotal] = await Promise.all([
    prisma.customer.count({ where: base }),
    prisma.customer.count({ where: and(base, activeWhere()) }),
    prisma.customer.count({ where: and(base, { status: 'Free Trial' }) }),
    prisma.customer.findMany({ where: scope || {}, distinct: ['country'], select: { country: true }, orderBy: { country: 'asc' } }),
    prisma.customer.findMany({ where: and(scope, { salespersonId: { not: null } }), distinct: ['salespersonId'], select: { salesperson: { select: { name: true } } } }),
    salesperson ? prisma.customer.count({ where: and(scope, { salesperson: { name: salesperson } }) }) : 0,
    // Unfiltered total for the page subtitle ("76 profiles listed").
    prisma.customer.count({ where: scope || {} }),
    prisma.customer.findMany({
      where,
      orderBy: { id: 'asc' },
      skip,
      take: pageSize,
      include: { ...customerInclude, orders: { where: { date: { gte: daysAgo(ACTIVE_DAYS) } }, select: { id: true }, take: 1 } }
    }),
    prisma.customer.count({ where })
  ]);
  const stats = { total, active, inactive: total - active, freeTrial };

  return {
    items: rows.map((c) => ({ ...serializeCustomer(c), active: c.orders.length > 0 })),
    total: listTotal,
    page,
    pageSize,
    stats,
    facets: {
      countries: countryRows.map((r) => r.country).filter(Boolean),
      salespeople: salespersonRows.map((r) => r.salesperson?.name).filter(Boolean).sort(),
      salespersonCount,
      allCount
    }
  };
}

module.exports = { listOrders, listInvoices, listCustomers, searchIds };
