const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { serializeBankAccount } = require('../lib/serialize');
const { bankAccountSchema, bankAccountUpdateSchema } = require('../schemas/misc');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const accounts = await prisma.bankAccount.findMany({ orderBy: { id: 'asc' } });
  res.json(accounts.map(serializeBankAccount));
}));

router.post('/', requireAuth, requireAdmin, validateBody(bankAccountSchema), asyncHandler(async (req, res) => {
  const created = await prisma.bankAccount.create({ data: req.body });
  res.status(201).json(serializeBankAccount(created));
}));

router.patch('/:id', requireAuth, requireAdmin, validateBody(bankAccountUpdateSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.bankAccount.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Bank account not found.' });
  const updated = await prisma.bankAccount.update({ where: { id }, data: req.body });
  res.json(serializeBankAccount(updated));
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.bankAccount.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Bank account not found.' });
  await prisma.bankAccount.delete({ where: { id } });
  res.json({ ok: true });
}));

module.exports = router;
