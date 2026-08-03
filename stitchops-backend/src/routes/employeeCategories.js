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

module.exports = router;
