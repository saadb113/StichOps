const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { hashPassword, comparePassword } = require('../lib/password');
const { COOKIE_NAME, signToken, cookieOptions } = require('../lib/jwt');
const { serializeUser, serializeEmployee } = require('../lib/serialize');
const { employeeInclude } = require('../lib/includes');
const { loginSchema, changePasswordSchema, forgotPasswordSchema, adminRecoverySchema, resetPasswordSchema } = require('../schemas/auth');
const { broadcastNotification } = require('../lib/sse');
const mailer = require('../lib/mailer');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'No account found with that email.' });

  // There's no second admin to review an admin's own reset request, so
  // admins get an emailed reset link instead of the "notify the admin and
  // wait for approval" flow everyone else uses. If this server has no SMTP
  // configured, fall back to the recovery-code flow (/admin-recovery).
  if (user.role === 'ADMIN') {
    if (!(await mailer.isConfigured())) {
      return res.json({ ok: true, adminRecovery: true });
    }
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) }
    });
    const resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password?token=${token}`;
    await mailer.sendMail({
      to: user.email,
      subject: 'Reset your ElegantsDesign admin password',
      text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
      html: `<p>Click below to reset your ElegantsDesign admin password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`
    });
    return res.json({ ok: true, emailSent: true });
  }

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

// Resets an admin account's password given the server's ADMIN_RECOVERY_CODE
// env var — the one credential recovery path that doesn't depend on another
// admin approving it (there may not be one) or on email delivery (the app
// has no mail server). Whoever controls the server/.env controls recovery.
router.post('/admin-recovery', validateBody(adminRecoverySchema), asyncHandler(async (req, res) => {
  const configuredCode = process.env.ADMIN_RECOVERY_CODE;
  if (!configuredCode) {
    return res.status(503).json({ error: 'Admin recovery isn\'t set up on this server — set ADMIN_RECOVERY_CODE in its environment first.' });
  }
  const { email, code, password } = req.body;
  const providedBuf = Buffer.from(code);
  const configuredBuf = Buffer.from(configuredCode);
  const codeMatches = providedBuf.length === configuredBuf.length && crypto.timingSafeEqual(providedBuf, configuredBuf);
  if (!codeMatches) return res.status(401).json({ error: 'Incorrect recovery code.' });

  const user = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase(), role: 'ADMIN' } });
  if (!user) return res.status(400).json({ error: 'No admin account found with that email.' });

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } });
  res.json({ ok: true });
}));

// Consumes the token from the emailed reset link.
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired — request a new one.' });
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, mustChangePassword: false } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  ]);
  res.json({ ok: true });
}));

module.exports = router;
