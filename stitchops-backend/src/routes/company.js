const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { serializeCompany } = require('../lib/serialize');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: 1 } });
  res.json(serializeCompany(company));
}));

module.exports = router;
