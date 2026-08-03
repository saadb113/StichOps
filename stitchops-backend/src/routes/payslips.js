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

module.exports = router;
