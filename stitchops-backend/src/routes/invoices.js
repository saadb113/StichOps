const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { serializeInvoice } = require('../lib/serialize');
const { invoiceInclude } = require('../lib/includes');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const invoices = await prisma.invoice.findMany({ include: invoiceInclude, orderBy: { id: 'desc' } });
  res.json(invoices.map(serializeInvoice));
}));

// Invoices are no longer approved manually — lib/monthlyInvoicing.js bundles
// each customer's completed orders into one auto-approved invoice on the
// 1st of the month (checked reactively from routes/notifications.js).

router.patch('/:id/payment', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Invoice not found.' });

  const paymentStatus = existing.paymentStatus === 'Completed' ? 'Pending' : 'Completed';
  const updated = await prisma.invoice.update({ where: { id }, data: { paymentStatus }, include: invoiceInclude });
  res.json(serializeInvoice(updated));
}));

module.exports = router;
