const express = require('express');
const multer = require('multer');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { MODELS } = require('../lib/dataModels');
const { exportModel, exportAll } = require('../lib/dataExport');
const { importModel, importWorkbook } = require('../lib/dataImport');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname) || file.mimetype.includes('spreadsheet') || file.mimetype === 'application/vnd.ms-excel';
    if (!ok) return cb(Object.assign(new Error('Please upload an Excel (.xlsx) file.'), { status: 400 }));
    cb(null, true);
  }
});

router.use(requireAuth, requireAdmin);

router.get('/export/:model', asyncHandler(async (req, res) => {
  const { model } = req.params;
  if (!MODELS[model]) return res.status(404).json({ error: 'Unknown data page.' });
  const buffer = await exportModel(model, { from: req.query.from, to: req.query.to });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${model}.xlsx"`);
  res.send(buffer);
}));

router.get('/export-all', asyncHandler(async (req, res) => {
  const buffer = await exportAll({ from: req.query.from, to: req.query.to });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="stitchops-data.xlsx"');
  res.send(buffer);
}));

router.post('/import/:model', upload.single('file'), asyncHandler(async (req, res) => {
  const { model } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
  const result = await importModel(model, req.file.buffer);
  res.json(result);
}));

router.post('/import-all', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
  const results = await importWorkbook(req.file.buffer);
  res.json(results);
}));

module.exports = router;
