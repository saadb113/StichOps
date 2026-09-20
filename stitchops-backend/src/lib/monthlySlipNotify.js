const prisma = require('./prisma');
const { broadcastNotification } = require('./sse');
const { previousMonthPeriod } = require('./period');

// No cron in this app (see dueDates.js) — checked reactively whenever the
// admin's notification bell loads or reconnects. Once a month closes, every
// Salesperson/Designer's slip has at least their base salary sitting ready
// to approve, so this fires one bundled notification per newly-closed month
// rather than spamming one per employee.
let inFlight = null;
function checkSlipsReady() {
  if (!inFlight) inFlight = runCheck().finally(() => { inFlight = null; });
  return inFlight;
}

async function runCheck() {
  const { periodStart } = previousMonthPeriod();

  const counter = await prisma.counter.findUnique({ where: { id: 1 } });
  if (counter.lastSlipNotifyRun && counter.lastSlipNotifyRun.getTime() >= periodStart.getTime()) return;

  const monthLabel = periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const notification = await prisma.notification.create({
    data: {
      type: 'slips_ready',
      message: `Salary slips for ${monthLabel} are ready for approval.`,
      link: '/employees'
    }
  });
  broadcastNotification(notification);

  await prisma.counter.update({ where: { id: 1 }, data: { lastSlipNotifyRun: periodStart } });
}

module.exports = { checkSlipsReady };
