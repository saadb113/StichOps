// Shared "previous calendar month" boundary calc — used by the monthly
// auto-invoicing job, salary-slip approval gating, and the slips-ready
// notification, all of which only care about "everything up to the end of
// last month" rather than an exact month match.
function previousMonthPeriod(now = new Date()) {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { periodStart, periodEnd };
}

module.exports = { previousMonthPeriod };
