const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { globalSearch, dashboardSummary } = require('../lib/summaries');
const { loadScope } = require('../lib/scope');
const prisma = require('../lib/prisma');

const router = express.Router();

// Topbar search — scoped to the caller (salespeople only see their own).
router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  res.json(await globalSearch(req.query, req.user));
}));

router.get('/dashboard/summary', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  res.json(await dashboardSummary(req.query));
}));

// A screen's slice of the data (see lib/scope.js). Admin only — other roles
// already receive just their own records from the regular endpoints.
router.get('/scope', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  res.json(await loadScope(req.query));
}));

// Every month that has orders ("YYYY-MM") — the Net Profit month picker.
router.get('/reports/order-months', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const rows = await prisma.$queryRawUnsafe(`SELECT DISTINCT to_char("date", 'YYYY-MM') AS m FROM "Order" ORDER BY m DESC`);
  res.json(rows.map((r) => r.m));
}));

module.exports = router;
