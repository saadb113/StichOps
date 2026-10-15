const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { serializeInvoice } = require('../lib/serialize');
const { invoiceInclude } = require('../lib/includes');
const { sendMail } = require('../lib/mailer');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const invoices = await prisma.invoice.findMany({ include: invoiceInclude, orderBy: { id: 'desc' } });
  res.json(invoices.map(serializeInvoice));
}));

// Invoices are no longer approved manually — lib/monthlyInvoicing.js bundles
// each customer's completed orders into one auto-approved invoice on the
// 1st of the month (checked reactively from routes/notifications.js).

const PAYMENT_METHODS = ['Stripe', 'Wise', 'Bank Transfer', 'Cash', 'Other'];

// Marking Paid takes the details from the popup (date, method, note);
// reverting to Pending clears them again.
router.patch('/:id/payment', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Invoice not found.' });

  let data;
  if (existing.paymentStatus === 'Completed') {
    data = { paymentStatus: 'Pending', paidDate: null, paymentMethod: null, paymentNote: null };
  } else {
    const { paidDate, method, note } = req.body || {};
    if (paidDate && !/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) return res.status(400).json({ error: 'Invalid payment date.' });
    if (method && !PAYMENT_METHODS.includes(method)) return res.status(400).json({ error: 'Invalid payment method.' });
    data = {
      paymentStatus: 'Completed',
      paidDate: paidDate ? new Date(paidDate + 'T00:00:00.000Z') : new Date(),
      paymentMethod: method || null,
      paymentNote: note && String(note).trim() ? String(note).trim().slice(0, 500) : null
    };
  }
  const updated = await prisma.invoice.update({ where: { id }, data, include: invoiceInclude });
  res.json(serializeInvoice(updated));
}));

// Emails the customer a payment reminder. A paid invoice never gets one —
// that is how reminders stop once someone has paid.
router.post('/:id/remind', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { customer: true } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
  if (invoice.paymentStatus === 'Completed') {
    return res.status(400).json({ error: 'This invoice is already paid — no reminder needed.' });
  }
  const to = invoice.customer.email && invoice.customer.email.trim();
  if (!to) return res.status(400).json({ error: 'This customer has no email address on file.' });

  const company = await prisma.company.findUnique({ where: { id: 1 } });
  const amount = invoice.currency + ' ' + invoice.total.toFixed(2);
  const name = invoice.customer.name || invoice.customer.company;
  const from = company?.name || 'The Elegants Design';
  await sendMail({
    to,
    subject: 'Payment reminder — invoice ' + invoice.invoiceNo,
    text: `Hi ${name},\n\nThis is a friendly reminder that invoice ${invoice.invoiceNo} for ${amount} is still unpaid. If you have already paid, please ignore this message and accept our thanks.\n\nKind regards,\n${from}`,
    html: '<p>Hi ' + name + ',</p><p>This is a friendly reminder that invoice <strong>' + invoice.invoiceNo + '</strong> for <strong>' + amount + '</strong> is still unpaid. If you have already paid, please ignore this message and accept our thanks.</p><p>Kind regards,<br/>' + from + '</p>'
  });
  const updated = await prisma.invoice.update({
    where: { id },
    data: { lastReminderAt: new Date(), reminderCount: { increment: 1 } },
    include: invoiceInclude
  });
  res.json(serializeInvoice(updated));
}));

// Lets admin override which bank account's details appear on an already
// generated invoice (independent of the customer's preferredBankAccountId,
// which only seeds new invoices going forward).
router.patch('/:id/bank-account', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Invoice not found.' });

  const { bankAccountId } = req.body;
  if (bankAccountId != null) {
    const account = await prisma.bankAccount.findUnique({ where: { id: Number(bankAccountId) } });
    if (!account) return res.status(400).json({ error: 'That bank account no longer exists.' });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { bankAccountId: bankAccountId != null ? Number(bankAccountId) : null },
    include: invoiceInclude
  });
  res.json(serializeInvoice(updated));
}));

module.exports = router;
