const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Small helper endpoint the UI uses to preview server-generated numbers
// before the record actually exists (e.g. "will be numbered INV-0232",
// or the suggested next Customer ID).
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const counter = await prisma.counter.findUnique({ where: { id: 1 } });
  res.json({ nextInvoiceNo: counter.nextInvoiceNo, nextCustomerCode: counter.nextCustomerCode });
}));

module.exports = router;
