const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { serializePasswordResetRequest } = require('../lib/serialize');
const { hashPassword, genTempPassword } = require('../lib/password');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const requests = await prisma.passwordResetRequest.findMany({ orderBy: { id: 'asc' } });
  res.json(requests.map(serializePasswordResetRequest));
}));

router.post('/:id/approve', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const request = await prisma.passwordResetRequest.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ error: 'Request not found.' });

  const employee = await prisma.employee.findUnique({ where: { id: request.employeeId } });
  const user = await prisma.user.findUnique({ where: { email: request.email.toLowerCase() } });
  if (!user || !employee) return res.status(404).json({ error: 'Could not find that account.' });

  const tempPw = genTempPassword();
  const passwordHash = await hashPassword(tempPw);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: true } }),
    prisma.passwordResetRequest.delete({ where: { id } })
  ]);

  res.json({ name: employee.name, email: user.email, tempPw });
}));

module.exports = router;
