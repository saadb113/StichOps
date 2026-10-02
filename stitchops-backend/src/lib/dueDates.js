const prisma = require('./prisma');
const { broadcastNotification } = require('./sse');

// There's no cron/scheduler in this app, so payout-day and invoice-day
// notifications are checked reactively — whenever the admin's notification
// bell loads or reconnects (see routes/notifications.js). Each check is
// idempotent per calendar day, but the GET / and SSE connect that both run
// on every page load can land within the same millisecond, so a shared
// in-flight promise guards against both racing past the "already exists"
// check before either has committed its insert.
let inFlight = null;
function checkDueDates() {
  if (!inFlight) inFlight = runCheck().finally(() => { inFlight = null; });
  return inFlight;
}

async function runCheck() {
  const now = new Date();
  const todayDay = now.getDate();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dueEmployees = await prisma.employee.findMany({ where: { payoutDay: todayDay } });
  for (const emp of dueEmployees) {
    const already = await prisma.notification.findFirst({
      where: { type: 'payout_day', employeeId: emp.id, createdAt: { gte: startOfToday } }
    });
    if (already) continue;
    const notification = await prisma.notification.create({
      data: {
        type: 'payout_day',
        message: `Today is ${emp.name}'s payout day.`,
        link: `/employees/${emp.id}`,
        employeeId: emp.id
      }
    });
    broadcastNotification(notification);
  }

  // Invoice Notification Date goes up to 31, which doesn't exist in every
  // month — a customer set to 31 (or 29/30 in February) is treated as due
  // on the LAST day of a shorter month, so the notification never silently
  // skips that month. Mirrors the frontend's lib/helpers.js clamping.
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dueCustomers = await prisma.customer.findMany({
    where: {
      OR: [
        { invoiceDay: todayDay },
        ...(todayDay === daysInMonth ? [{ invoiceDay: { gt: daysInMonth } }] : [])
      ]
    }
  });
  if (dueCustomers.length > 0) {
    const already = await prisma.notification.findFirst({
      where: { type: 'invoice_day', createdAt: { gte: startOfToday } }
    });
    if (!already) {
      const notification = await prisma.notification.create({
        data: {
          type: 'invoice_day',
          message: `${dueCustomers.length} customer${dueCustomers.length > 1 ? 's have' : ' has'} their invoice notification date today.`,
          link: '/invoices?dueToday=1'
        }
      });
      broadcastNotification(notification);
    }
  }
}

module.exports = { checkDueDates };
