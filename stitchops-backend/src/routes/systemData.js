const express = require('express');
const multer = require('multer');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { MODELS } = require('../lib/dataModels');
const { exportModel, exportAll } = require('../lib/dataExport');
const { importModel, importWorkbook, previewFile, isOwnExport } = require('../lib/dataImport');
const legacy = require('../lib/legacyImport');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname) || file.mimetype.includes('spreadsheet') || file.mimetype === 'application/vnd.ms-excel' || file.mimetype === 'text/csv';
    if (!ok) return cb(Object.assign(new Error('Please upload an Excel (.xlsx) or CSV file.'), { status: 400 }));
    cb(null, true);
  }
});

router.use(requireAuth, requireAdmin);

router.get('/export/:model', asyncHandler(async (req, res) => {
  const { model } = req.params;
  if (!MODELS[model]) return res.status(404).json({ error: 'Unknown data page.' });
  const buffer = await exportModel(model, { from: req.query.from, to: req.query.to });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="ElegantsDesign_${model}.xlsx"`);
  res.send(buffer);
}));

router.get('/export-all', asyncHandler(async (req, res) => {
  const buffer = await exportAll({ from: req.query.from, to: req.query.to });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="ElegantsDesign_all_data.xlsx"');
  res.send(buffer);
}));

router.post('/import/:model/preview', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
  res.json(previewFile(req.params.model, req.file.buffer));
}));

router.post('/import/:model', upload.single('file'), asyncHandler(async (req, res) => {
  const { model } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
  let mapping = null;
  if (req.body.mapping) {
    try {
      mapping = JSON.parse(req.body.mapping);
    } catch {
      return res.status(400).json({ error: 'Invalid column mapping.' });
    }
  }
  const result = await importModel(model, req.file.buffer, mapping);
  res.json(result);
}));

router.post('/import-all/preview', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
  res.json({ legacy: !isOwnExport(req.file.buffer) });
}));

router.post('/import-all', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
  // Not one of our exports → tell the UI to open the "Import old data" wizard.
  if (!isOwnExport(req.file.buffer)) return res.json({ legacy: true });
  const results = await importWorkbook(req.file.buffer);
  res.json(results);
}));

// ---------- "Import old data" (client's own order sheets) ----------
function jsonField(req, name) {
  if (!req.body[name]) return {};
  try { return JSON.parse(req.body[name]); } catch { throw Object.assign(new Error(`Invalid ${name}.`), { status: 400 }); }
}

router.post('/legacy/preview', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
  res.json(await legacy.buildPlan(req.file.buffer, jsonField(req, 'options')));
}));

router.post('/legacy/import', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
  res.json(await legacy.runImport(req.file.buffer, req.file.originalname, jsonField(req, 'options'), jsonField(req, 'decisions')));
}));

router.get('/legacy/batches', asyncHandler(async (req, res) => {
  res.json(await legacy.listBatches());
}));

router.delete('/legacy/batches/:id', asyncHandler(async (req, res) => {
  res.json(await legacy.undoBatch(req.params.id));
}));

module.exports = router;
