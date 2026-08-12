const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { companyEmailSchema, companyEmailUpdateSchema } = require('../schemas/misc');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const emails = await prisma.companyEmail.findMany({ orderBy: { id: 'asc' } });
  res.json(emails.map((e) => e.email));
}));

router.post('/', requireAuth, requireAdmin, validateBody(companyEmailSchema), asyncHandler(async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const clash = await prisma.companyEmail.findUnique({ where: { email } });
  if (clash) return res.status(409).json({ error: 'That email is already in the pool.' });
  if (req.body.employeeId != null) {
    const employee = await prisma.employee.findUnique({ where: { id: req.body.employeeId } });
    if (!employee) return res.status(400).json({ error: 'Employee not found.' });
  }
  await prisma.companyEmail.create({ data: { email, employeeId: req.body.employeeId ?? null } });
  const emails = await prisma.companyEmail.findMany({ orderBy: { id: 'asc' } });
  res.status(201).json(emails.map((e) => e.email));
}));

router.patch('/:email', requireAuth, requireAdmin, validateBody(companyEmailUpdateSchema), asyncHandler(async (req, res) => {
  const currentEmail = decodeURIComponent(req.params.email).toLowerCase();
  const existing = await prisma.companyEmail.findUnique({ where: { email: currentEmail } });
  if (!existing) return res.status(404).json({ error: 'Email not found in the pool.' });

  const data = {};
  if (req.body.email !== undefined) {
    const nextEmail = req.body.email.trim().toLowerCase();
    if (nextEmail !== currentEmail) {
      const clash = await prisma.companyEmail.findUnique({ where: { email: nextEmail } });
      if (clash) return res.status(409).json({ error: 'That email is already in the pool.' });
      data.email = nextEmail;
    }
  }
  if (req.body.employeeId !== undefined) {
    if (req.body.employeeId != null) {
      const employee = await prisma.employee.findUnique({ where: { id: req.body.employeeId } });
      if (!employee) return res.status(400).json({ error: 'Employee not found.' });
    }
    data.employeeId = req.body.employeeId;
  }

  await prisma.companyEmail.update({ where: { email: currentEmail }, data });
  const emails = await prisma.companyEmail.findMany({ orderBy: { id: 'asc' } });
  res.json(emails.map((e) => e.email));
}));

router.delete('/:email', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const existing = await prisma.companyEmail.findUnique({ where: { email } });
  if (!existing) return res.status(404).json({ error: 'Email not found in the pool.' });
  await prisma.companyEmail.delete({ where: { email } });
  const emails = await prisma.companyEmail.findMany({ orderBy: { id: 'asc' } });
  res.json(emails.map((e) => e.email));
}));

module.exports = router;
