const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { globalSearch, dashboardSummary } = require('../lib/summaries');

const router = express.Router();

// Topbar search — scoped to the caller (salespeople only see their own).
router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  res.json(await globalSearch(req.query, req.user));
}));

router.get('/dashboard/summary', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  res.json(await dashboardSummary(req.query));
}));

module.exports = router;
