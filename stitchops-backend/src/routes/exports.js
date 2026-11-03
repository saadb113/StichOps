const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { exportOrders, exportInvoices, exportCustomers, exportEmployees } = require('../lib/exports');

const router = express.Router();

const EXPORTERS = {
  orders: exportOrders,
  invoices: exportInvoices,
  customers: exportCustomers,
  employees: exportEmployees
};

// GET /api/exports/:kind?<same filters as the list screen> → .xlsx
router.get('/:kind', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const exporter = EXPORTERS[req.params.kind];
  if (!exporter) return res.status(404).json({ error: 'Unknown export.' });
  const buffer = await exporter(req.query, req.user);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="ElegantsDesign_${req.params.kind}.xlsx"`);
  res.send(buffer);
}));

module.exports = router;
