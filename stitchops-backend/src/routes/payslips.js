const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { serializePayslip } = require('../lib/serialize');
const { payslipInclude } = require('../lib/includes');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const where = req.user.role === 'SALESPERSON' ? { employeeId: req.user.employeeId } : {};
  const payslips = await prisma.payslip.findMany({ where, include: payslipInclude, orderBy: { id: 'desc' } });
  res.json(payslips.map(serializePayslip));
}));

router.patch('/:id/payment', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.payslip.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Payslip not found.' });
  if (req.user.role === 'SALESPERSON' && existing.employeeId !== req.user.employeeId) {
    return res.status(403).json({ error: 'Not allowed.' });
  }

  const paymentStatus = existing.paymentStatus === 'Completed' ? 'Pending' : 'Completed';
  const updated = await prisma.payslip.update({ where: { id }, data: { paymentStatus }, include: payslipInclude });
  res.json(serializePayslip(updated));
}));

module.exports = router;
