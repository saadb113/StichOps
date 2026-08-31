const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { hashPassword, comparePassword } = require('../lib/password');
const { COOKIE_NAME, signToken, cookieOptions } = require('../lib/jwt');
const { serializeUser, serializeEmployee } = require('../lib/serialize');
const { employeeInclude } = require('../lib/includes');
const { loginSchema, changePasswordSchema, forgotPasswordSchema } = require('../schemas/auth');
const { broadcastNotification } = require('../lib/sse');

const router = express.Router();

async function loadEmployeeFor(user) {
  if (!user.employeeId) return null;
  const employee = await prisma.employee.findUnique({ where: { id: user.employeeId }, include: employeeInclude });
  return employee ? serializeEmployee(employee) : null;
}

router.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password, remember } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const token = signToken({ sub: user.id, role: user.role }, remember);
  res.cookie(COOKIE_NAME, token, cookieOptions(remember));
  res.json({ user: serializeUser(user), employee: await loadEmployeeFor(user) });
}));

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user), employee: await loadEmployeeFor(req.user) });
}));

router.post('/change-password', requireAuth, validateBody(changePasswordSchema), asyncHandler(async (req, res) => {
  if (req.body.currentPassword !== undefined) {
    const ok = await comparePassword(req.body.currentPassword, req.user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  const passwordHash = await hashPassword(req.body.password);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash, mustChangePassword: false }
  });
  res.json({ user: serializeUser(user), employee: await loadEmployeeFor(user) });
}));

router.post('/welcome', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { welcomed: true } });
  res.json({ user: serializeUser(user), employee: await loadEmployeeFor(user) });
}));

router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email, role: 'SALESPERSON' } });
  if (!user) return res.status(400).json({ error: 'No salesperson account found with that email.' });

  const existing = await prisma.passwordResetRequest.findFirst({ where: { email } });
  if (!existing) {
    await prisma.passwordResetRequest.create({
      data: { email, employeeId: user.employeeId, requestedAt: new Date() }
    });
    const employee = user.employeeId ? await prisma.employee.findUnique({ where: { id: user.employeeId } }) : null;
    const notification = await prisma.notification.create({
      data: {
        type: 'password_reset_request',
        message: `${employee ? employee.name : email} requested a password reset.`,
        link: '/employees',
        employeeId: user.employeeId
      }
    });
    broadcastNotification(notification);
  }
  res.json({ ok: true });
}));

module.exports = router;
