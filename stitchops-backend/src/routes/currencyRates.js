const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { serializeCurrencyRate } = require('../lib/serialize');
const { currencyRateSchema, currencyRateUpdateSchema } = require('../schemas/misc');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const rates = await prisma.currencyRate.findMany({ orderBy: { id: 'asc' } });
  res.json(rates.map(serializeCurrencyRate));
}));

router.post('/', requireAuth, requireAdmin, validateBody(currencyRateSchema), asyncHandler(async (req, res) => {
  const currency = req.body.currency.toUpperCase();
  const clash = await prisma.currencyRate.findUnique({ where: { currency } });
  if (clash) return res.status(409).json({ error: `${currency} already has a rate — edit it instead.` });
  const created = await prisma.currencyRate.create({ data: { ...req.body, currency } });
  res.status(201).json(serializeCurrencyRate(created));
}));

router.patch('/:currency', requireAuth, requireAdmin, validateBody(currencyRateUpdateSchema), asyncHandler(async (req, res) => {
  const currency = req.params.currency.toUpperCase();
  const existing = await prisma.currencyRate.findUnique({ where: { currency } });
  if (!existing) return res.status(404).json({ error: 'Currency not found.' });
  const updated = await prisma.currencyRate.update({ where: { currency }, data: req.body });
  res.json(serializeCurrencyRate(updated));
}));

router.delete('/:currency', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const currency = req.params.currency.toUpperCase();
  const existing = await prisma.currencyRate.findUnique({ where: { currency } });
  if (!existing) return res.status(404).json({ error: 'Currency not found.' });
  await prisma.currencyRate.delete({ where: { currency } });
  res.json({ ok: true });
}));

module.exports = router;
