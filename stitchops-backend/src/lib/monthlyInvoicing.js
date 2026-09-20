const prisma = require('./prisma');
const { broadcastNotification } = require('./sse');
const { invoiceInclude } = require('./includes');
const { nextInvoiceNumberForCustomer } = require('./invoiceNumber');
const { parseDateOnly, today } = require('./date');

// There's no cron/scheduler in this app (see dueDates.js), so the monthly
// invoice run is checked reactively too — whenever the admin's notification
// bell loads or reconnects. On the first check after the 1st of a month, it
// bundles each customer's Completed, not-yet-invoiced orders dated on or
// before the end of the *previous* month into one auto-approved invoice, so
// an order still Pending/In progress when the month turns over just waits —
// it gets swept into whichever later run covers it once it's Completed,
// since the date bound is "on or before", not an exact month match.
let inFlight = null;
function runMonthlyInvoicing() {
  if (!inFlight) inFlight = runCheck().finally(() => { inFlight = null; });
  return inFlight;
}

async function runCheck() {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)); // last day of previous month

  const counter = await prisma.counter.findUnique({ where: { id: 1 } });
  if (counter.lastAutoInvoiceRun && counter.lastAutoInvoiceRun.getTime() >= periodStart.getTime()) return;

  const customers = await prisma.customer.findMany();
  const todayDate = parseDateOnly(today());

  for (const customer of customers) {
    const draft = await prisma.order.findMany({
      where: { customerId: customer.id, invoiceId: null, status: 'Completed', date: { lte: periodEnd } }
    });
    if (!draft.length) continue;

    const total = draft.reduce((s, o) => s + o.price, 0);

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNo = await nextInvoiceNumberForCustomer(tx, customer);
      const created = await tx.invoice.create({
        data: {
          customerId: customer.id,
          invoiceNo,
          version: 1,
          total,
          currency: customer.currency,
          generatedDate: todayDate,
          approvedDate: todayDate,
          paymentStatus: 'Pending'
        }
      });

      await tx.order.updateMany({
        where: { id: { in: draft.map((o) => o.id) } },
        data: { invoiceId: created.id }
      });

      return tx.invoice.findUnique({ where: { id: created.id }, include: invoiceInclude });
    });

    const notification = await prisma.notification.create({
      data: {
        type: 'invoice_generated',
        message: `${invoice.invoiceNo} was auto-generated for ${customer.company}.`,
        link: `/customers/${customer.id}`,
        employeeId: customer.salespersonId
      }
    });
    broadcastNotification(notification);
  }

  await prisma.counter.update({ where: { id: 1 }, data: { lastAutoInvoiceRun: periodStart } });
}

module.exports = { runMonthlyInvoicing };
