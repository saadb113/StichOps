const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { serializeInvoice } = require('../lib/serialize');
const { invoiceInclude } = require('../lib/includes');
const { parseDateOnly, today } = require('../lib/date');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const invoices = await prisma.invoice.findMany({ include: invoiceInclude, orderBy: { id: 'desc' } });
  res.json(invoices.map(serializeInvoice));
}));

router.post('/approve', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const customerId = Number(req.body.customerId);
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });

  const draft = await prisma.order.findMany({
    where: { customerId, invoiceId: null, status: 'Completed' }
  });
  if (!draft.length) return res.status(400).json({ error: 'Nothing to invoice.' });

  const total = draft.reduce((s, o) => s + o.price, 0);
  const todayDate = parseDateOnly(today());

  const invoice = await prisma.$transaction(async (tx) => {
    const counter = await tx.counter.update({ where: { id: 1 }, data: { nextInvoiceNo: { increment: 1 } } });
    const invoiceNo = 'INV-0' + (counter.nextInvoiceNo - 1);

    const created = await tx.invoice.create({
      data: {
        customerId,
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

  res.status(201).json(serializeInvoice(invoice));
}));

router.patch('/:id/payment', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Invoice not found.' });

  const paymentStatus = existing.paymentStatus === 'Completed' ? 'Pending' : 'Completed';
  const updated = await prisma.invoice.update({ where: { id }, data: { paymentStatus }, include: invoiceInclude });
  res.json(serializeInvoice(updated));
}));

module.exports = router;
