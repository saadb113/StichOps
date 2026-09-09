const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { categorySchema } = require('../schemas/misc');
const { isForeignKeyViolation } = require('../lib/prismaErrors');

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

// Deleting a team deletes its employees too (login included) — matches the
// confirmation copy in the Edit Teams design. An employee who still has
// assigned customers, orders, payslips, or password reset requests can't be
// deleted (same rule as the single-employee delete route), so the whole
// removal is rejected with a clear reason rather than partially cascading.
router.delete('/:name', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const name = req.params.name;
  if (PROTECTED.includes(name)) return res.status(400).json({ error: `"${name}" can't be removed.` });
  const existing = await prisma.employeeCategory.findUnique({ where: { name } });
  if (!existing) return res.status(404).json({ error: 'Tab not found.' });
  const members = await prisma.employee.findMany({ where: { role: name } });
  try {
    await prisma.$transaction(async (tx) => {
      for (const emp of members) {
        await tx.user.deleteMany({ where: { employeeId: emp.id } });
        await tx.employee.delete({ where: { id: emp.id } });
      }
      await tx.employeeCategory.delete({ where: { name } });
    });
  } catch (e) {
    if (isForeignKeyViolation(e)) {
      return res.status(409).json({ error: `Can't remove "${name}" — one or more of its employees still have assigned customers, orders, payslips, or password reset requests. Reassign or remove those first.` });
    }
    throw e;
  }
  const categories = await prisma.employeeCategory.findMany({ orderBy: { id: 'asc' } });
  res.json(categories.map((c) => c.name));
}));

module.exports = router;
