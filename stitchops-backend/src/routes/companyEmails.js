const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { companyEmailSchema } = require('../schemas/misc');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const emails = await prisma.companyEmail.findMany({ orderBy: { id: 'asc' } });
  res.json(emails.map((e) => e.email));
}));

router.post('/', requireAuth, requireAdmin, validateBody(companyEmailSchema), asyncHandler(async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const clash = await prisma.companyEmail.findUnique({ where: { email } });
  if (clash) return res.status(409).json({ error: 'That email is already in the pool.' });
  await prisma.companyEmail.create({ data: { email } });
  const emails = await prisma.companyEmail.findMany({ orderBy: { id: 'asc' } });
  res.status(201).json(emails.map((e) => e.email));
}));

router.delete('/:email', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const existing = await prisma.companyEmail.findUnique({ where: { email }, include: { employee: true } });
  if (!existing) return res.status(404).json({ error: 'Email not found in the pool.' });
  if (existing.employeeId) {
    return res.status(409).json({ error: `Unassign this from ${existing.employee.name} before removing it.` });
  }
  await prisma.companyEmail.delete({ where: { email } });
  const emails = await prisma.companyEmail.findMany({ orderBy: { id: 'asc' } });
  res.json(emails.map((e) => e.email));
}));

module.exports = router;
