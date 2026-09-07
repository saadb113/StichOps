const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { categorySchema } = require('../schemas/misc');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const categories = await prisma.employeeCategory.findMany({ orderBy: { id: 'asc' } });
  res.json(categories.map((c) => c.name));
}));

router.post('/', requireAuth, requireAdmin, validateBody(categorySchema), asyncHandler(async (req, res) => {
  const name = req.body.name;
  const clash = await prisma.employeeCategory.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (clash) return res.status(409).json({ error: 'A tab with that name already exists.' });
  await prisma.employeeCategory.create({ data: { name } });
  const categories = await prisma.employeeCategory.findMany({ orderBy: { id: 'asc' } });
  res.status(201).json(categories.map((c) => c.name));
}));

// Salesperson and Designer drive dedicated commission/production-cost logic
// elsewhere in the app (OrderFormModal, EarningsTab, payslips) — renaming or
// removing them would silently break that, so they're protected here.
const PROTECTED = ['Salesperson', 'Designer'];

router.patch('/:name', requireAuth, requireAdmin, validateBody(categorySchema), asyncHandler(async (req, res) => {
  const oldName = req.params.name;
  const newName = req.body.name;
  if (PROTECTED.includes(oldName)) return res.status(400).json({ error: `"${oldName}" can't be renamed.` });
  const existing = await prisma.employeeCategory.findUnique({ where: { name: oldName } });
  if (!existing) return res.status(404).json({ error: 'Tab not found.' });
  if (newName.toLowerCase() !== oldName.toLowerCase()) {
    const clash = await prisma.employeeCategory.findFirst({ where: { name: { equals: newName, mode: 'insensitive' } } });
    if (clash) return res.status(409).json({ error: 'A tab with that name already exists.' });
  }
  await prisma.$transaction([
    prisma.employeeCategory.update({ where: { name: oldName }, data: { name: newName } }),
    prisma.employee.updateMany({ where: { role: oldName }, data: { role: newName } })
  ]);
  const categories = await prisma.employeeCategory.findMany({ orderBy: { id: 'asc' } });
  res.json(categories.map((c) => c.name));
}));

router.delete('/:name', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const name = req.params.name;
  if (PROTECTED.includes(name)) return res.status(400).json({ error: `"${name}" can't be removed.` });
  const existing = await prisma.employeeCategory.findUnique({ where: { name } });
  if (!existing) return res.status(404).json({ error: 'Tab not found.' });
  const memberCount = await prisma.employee.count({ where: { role: name } });
  if (memberCount > 0) return res.status(409).json({ error: `Move or remove its ${memberCount} employee${memberCount > 1 ? 's' : ''} first.` });
  await prisma.employeeCategory.delete({ where: { name } });
  const categories = await prisma.employeeCategory.findMany({ orderBy: { id: 'asc' } });
  res.json(categories.map((c) => c.name));
}));

module.exports = router;
