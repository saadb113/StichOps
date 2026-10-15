const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const serialize = (e) => ({ id: e.id, month: e.month, label: e.label, amount: e.amount });

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const where = req.query.month ? { month: String(req.query.month) } : {};
  const expenses = await prisma.expense.findMany({ where, orderBy: { id: 'asc' } });
  res.json(expenses.map(serialize));
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { month, label, amount } = req.body;
  const value = Number(amount);
  if (!/^\d{4}-\d{2}$/.test(month || '')) return res.status(400).json({ error: 'Pick a month.' });
  if (!label || !String(label).trim()) return res.status(400).json({ error: 'Enter what the expense is for.' });
  if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Enter an amount above zero.' });
  const created = await prisma.expense.create({ data: { month, label: String(label).trim(), amount: value } });
  res.status(201).json(serialize(created));
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.expense.deleteMany({ where: { id } });
  res.json({ ok: true });
}));

module.exports = router;
