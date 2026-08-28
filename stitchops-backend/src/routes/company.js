const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { serializeCompany } = require('../lib/serialize');
const { companyUpdateSchema } = require('../schemas/misc');
const { upload, deleteUploadedFile } = require('../lib/upload');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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

module.exports = router;
