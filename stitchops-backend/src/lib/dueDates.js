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

  const dueCustomers = await prisma.customer.findMany({ where: { invoiceDay: todayDay } });
  if (dueCustomers.length > 0) {
    const already = await prisma.notification.findFirst({
      where: { type: 'invoice_day', createdAt: { gte: startOfToday } }
    });
    if (!already) {
      const notification = await prisma.notification.create({
        data: {
          type: 'invoice_day',
          message: `${dueCustomers.length} customer${dueCustomers.length > 1 ? 's have' : ' has'} their invoice day today.`,
          link: '/invoices?dueToday=1'
        }
      });
      broadcastNotification(notification);
    }
  }
}

module.exports = { checkDueDates };
