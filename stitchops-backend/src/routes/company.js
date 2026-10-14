const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { serializeCompany } = require('../lib/serialize');
const { companyUpdateSchema, smtpSettingsSchema, smtpTestSchema } = require('../schemas/misc');
const { upload, deleteUploadedFile } = require('../lib/upload');
const mailer = require('../lib/mailer');

const router = express.Router();

// Readable by any authenticated user (not just admins) — salespeople need
// company.defaultCurrency to display their own pay/commission figures
// consistently with the admin side.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: 1 } });
  res.json(serializeCompany(company));
}));

router.patch('/', requireAuth, requireAdmin, validateBody(companyUpdateSchema), asyncHandler(async (req, res) => {
  const updated = await prisma.company.update({ where: { id: 1 }, data: req.body });
  res.json(serializeCompany(updated));
}));

router.post('/logo', requireAuth, requireAdmin, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image was uploaded.' });
  const existing = await prisma.company.findUnique({ where: { id: 1 } });
  const logo = `/uploads/${req.file.filename}`;
  const updated = await prisma.company.update({ where: { id: 1 }, data: { logo } });
  if (existing?.logo) deleteUploadedFile(existing.logo);
  res.json(serializeCompany(updated));
}));

router.delete('/logo', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const existing = await prisma.company.findUnique({ where: { id: 1 } });
  const updated = await prisma.company.update({ where: { id: 1 }, data: { logo: null } });
  if (existing?.logo) deleteUploadedFile(existing.logo);
  res.json(serializeCompany(updated));
}));

// Admin-only — unlike GET /company (readable by any authenticated user for
// defaultCurrency), SMTP host/username are internal infra details with no
// reason to reach a non-admin's screen, and smtpPass never leaves the
// server at all (passSet tells the UI whether one is already saved).
router.get('/smtp', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: 1 } });
  res.json({
    smtpHost: company.smtpHost || '',
    smtpPort: company.smtpPort || null,
    smtpUser: company.smtpUser || '',
    smtpFrom: company.smtpFrom || '',
    passSet: Boolean(company.smtpPass)
  });
}));

router.patch('/smtp', requireAuth, requireAdmin, validateBody(smtpSettingsSchema), asyncHandler(async (req, res) => {
  const data = {};
  if (req.body.smtpHost !== undefined) data.smtpHost = req.body.smtpHost || null;
  if (req.body.smtpPort !== undefined) data.smtpPort = req.body.smtpPort;
  if (req.body.smtpUser !== undefined) data.smtpUser = req.body.smtpUser || null;
  if (req.body.smtpFrom !== undefined) data.smtpFrom = req.body.smtpFrom || null;
  // Omitted entirely = keep the saved password; sent (even "") = replace it.
  if (Object.prototype.hasOwnProperty.call(req.body, 'smtpPass')) {
    data.smtpPass = req.body.smtpPass || null;
  }
  const company = await prisma.company.update({ where: { id: 1 }, data });
  res.json({
    smtpHost: company.smtpHost || '',
    smtpPort: company.smtpPort || null,
    smtpUser: company.smtpUser || '',
    smtpFrom: company.smtpFrom || '',
    passSet: Boolean(company.smtpPass)
  });
}));

router.post('/smtp/test', requireAuth, requireAdmin, validateBody(smtpTestSchema), asyncHandler(async (req, res) => {
  const settings = await mailer.getSettings();
  if (!settings) return res.status(400).json({ error: 'Save SMTP settings first.' });
  try {
    await mailer.verifySettings(settings);
  } catch (e) {
    return res.status(400).json({ error: `Couldn't authenticate with that SMTP server: ${e.message}` });
  }
  try {
    await mailer.sendMail({
      to: req.body.to,
      subject: 'StitchOps test email',
      text: 'This is a test email from StitchOps — your SMTP settings are working.',
      html: '<p>This is a test email from StitchOps — your SMTP settings are working.</p>'
    });
  } catch (e) {
    return res.status(400).json({ error: `Authenticated, but sending failed: ${e.message}` });
  }
  res.json({ ok: true });
}));

module.exports = router;
