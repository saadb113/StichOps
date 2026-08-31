import { SYM, TODAY } from './constants';

export function fmt(amount, ccy) {
  return SYM[ccy] + ' ' + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function findCustomer(customers, id) {
  return customers.find(c => c.id === id);
}

export function ordersFor(orders, customerId) {
  return orders.filter(o => o.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date));
}

export function isActive(orders, cust, refDate = TODAY) {
  const os = ordersFor(orders, cust.id);
  if (!os.length) return false;
  const last = new Date(os[0].date);
  const diffDays = (new Date(refDate) - last) / 86400000;
  return diffDays <= 15;
}

export function commissionAmt(o) {
  return o.price * (o.commissionRate / 100);
}

export function paymentBadge(inv, today = TODAY) {
  if (inv.paymentStatus === 'Completed') return { label: 'Paid', cls: 'b-completed' };
  const days = Math.floor((new Date(today) - new Date(inv.approvedDate || inv.generatedDate)) / 86400000);
  const months = Math.floor(days / 30);
  if (months >= 2) return { label: `Unpaid — ${months} months`, cls: 'b-unpaid' };
  if (months >= 1) return { label: 'Unpaid — 1 month', cls: 'b-unpaid' };
  return { label: 'Pending', cls: 'b-pending' };
}

export function nth(n) {
  if (n % 10 === 1 && n !== 11) return 'st';
  if (n % 10 === 2 && n !== 12) return 'nd';
  if (n % 10 === 3 && n !== 13) return 'rd';
  return 'th';
}

export function statusBadgeClass(s) {
  if (s === 'Completed') return 'b-completed';
  if (s === 'On hold') return 'b-review';
  if (s === 'Cancelled') return 'b-inactive';
  if (s === 'In progress') return 'b-review';
  return 'b-pending';
}

export function statusSelectBg(s) {
  if (s === 'Completed') return 'var(--accent-soft)';
  if (s === 'On hold' || s === 'In progress') return 'var(--amber-soft)';
  if (s === 'Cancelled') return 'var(--surface)';
  return 'var(--amber-soft)';
}

export function statusSelectFg(s) {
  if (s === 'Completed') return 'var(--accent)';
  if (s === 'On hold' || s === 'In progress') return 'var(--amber-ink)';
  if (s === 'Cancelled') return 'var(--ink-3)';
  return 'var(--amber-ink)';
}

export function customerOverdueInvoices(invoices, customerId, today = TODAY) {
  return invoices.filter(i => i.customerId === customerId && i.status === 'approved' && i.paymentStatus !== 'Completed' && paymentBadge(i, today).cls === 'b-unpaid');
}

export function ordersInRange(orders, from, to) {
  return orders.filter(o => o.date >= from && o.date <= to);
}

export function rangeLengthDays(from, to) {
  return Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
}

export function shiftRange(from, to, days) {
  const f = new Date(from); f.setDate(f.getDate() - days);
  const t = new Date(to); t.setDate(t.getDate() - days);
  return [f.toISOString().slice(0, 10), t.toISOString().slice(0, 10)];
}

export function growthPct(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export function ordersForEmployee(orders, customers, emp) {
  if (emp.role === 'Salesperson') {
    const custIds = customers.filter(c => c.salesperson === emp.name).map(c => c.id);
    return orders.filter(o => custIds.includes(o.customerId));
  }
  if (emp.role === 'Designer') {
    return orders.filter(o => o.designer === emp.name);
  }
  return [];
}

export function unpaidAmountFor(orders, customers, emp) {
  const os = ordersForEmployee(orders, customers, emp);
  const byCcy = {};
  os.forEach(o => {
    const paid = emp.role === 'Salesperson' ? o.commissionPaid : o.productionPaid;
    if (paid || o.status !== 'Completed') return;
    const amt = emp.role === 'Salesperson' ? commissionAmt(o) : o.productionCost;
    const cc = emp.role === 'Salesperson' ? o.currency : (o.productionCostCurrency || o.currency);
    byCcy[cc] = (byCcy[cc] || 0) + amt;
  });
  return byCcy;
}

export function genTempPassword() {
  return 'Temp-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Converts an amount in `ccy` to the company's default currency using stored
// CurrencyRate rows (rate = units of default currency per 1 unit of ccy).
// Returns null when there's no rate to convert with (ccy isn't the default
// and has no stored rate), so callers can decide how to display "unknown".
export function convertToDefault(amount, ccy, rates, defaultCcy) {
  if (ccy === defaultCcy) return amount;
  const r = rates.find((x) => x.currency === ccy);
  return r ? amount * r.rate : null;
}

// Converts a {currency: amount} breakdown (e.g. from unpaidAmountFor) into a
// single total in the default currency. In-house figures — production cost,
// salaries, commissions, payslips — are always reported this way; only
// customer-facing order prices and invoices keep their own currency.
// Returns null if any bucket's currency has no stored rate to convert with.
export function sumConvertedToDefault(byCcy, rates, defaultCcy) {
  let total = 0;
  for (const [cc, amt] of Object.entries(byCcy)) {
    const converted = convertToDefault(amt, cc, rates, defaultCcy);
    if (converted == null) return null;
    total += converted;
  }
  return total;
}
