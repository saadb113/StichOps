const XLSX = require('xlsx');
const { MODELS, coerceIn, prisma } = require('./dataModels');

async function upsertRow(modelKey, row) {
  const model = MODELS[modelKey];
  const prismaModel = prisma[model.prismaModel];
  const data = {};
  for (const col of model.columns) {
    if (col === 'id') continue;
    const raw = row[col];
    if (raw !== undefined && raw !== null && raw !== '') data[col] = coerceIn(col, raw);
  }

  const idRaw = row.id;
  const id = idRaw !== undefined && idRaw !== null && idRaw !== '' ? Number(idRaw) : null;

  if (id) {
    const existing = await prismaModel.findUnique({ where: { id } });
    if (existing) {
      await prismaModel.update({ where: { id }, data });
      return 'updated';
    }
    await prismaModel.create({ data: { id, ...data } });
    return 'created';
  }
  await prismaModel.create({ data });
  return 'created';
}

async function importSheetRows(modelKey, jsonRows) {
  const result = { created: 0, updated: 0, errors: [] };
  for (let i = 0; i < jsonRows.length; i++) {
    try {
      const outcome = await upsertRow(modelKey, jsonRows[i]);
      result[outcome] += 1;
    } catch (err) {
      // Prisma errors carry a multi-line explanation with a code pointer —
      // keep just the last non-empty line, which is the actual reason.
      const lines = String(err.message).split('\n').map((l) => l.trim()).filter(Boolean);
      const reason = lines[lines.length - 1] || err.message;
      // Row 1 is the header, so the first data row is spreadsheet row 2.
      result.errors.push({ row: i + 2, message: reason });
    }
  }
  return result;
}

function findSheetForModel(workbook, modelKey) {
  const model = MODELS[modelKey];
  const wanted = [modelKey.toLowerCase(), model.label.toLowerCase()];
  return workbook.SheetNames.find((n) => wanted.includes(n.toLowerCase())) || workbook.SheetNames[0];
}

async function importModel(modelKey, buffer) {
  if (!MODELS[modelKey] || !MODELS[modelKey].importable) {
    const err = new Error('This page does not support importing data.');
    err.status = 400;
    throw err;
  }
  const workbook = XLSX.read(buffer, { cellDates: true });
  const sheetName = findSheetForModel(workbook, modelKey);
  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  return importSheetRows(modelKey, jsonRows);
}

async function importWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { cellDates: true });
  const results = {};
  for (const modelKey of Object.keys(MODELS)) {
    const model = MODELS[modelKey];
    if (!model.importable) continue;
    const wanted = [modelKey.toLowerCase(), model.label.toLowerCase()];
    const sheetName = workbook.SheetNames.find((n) => wanted.includes(n.toLowerCase()));
    if (!sheetName) continue;
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    results[modelKey] = await importSheetRows(modelKey, jsonRows);
  }
  return results;
}

module.exports = { importModel, importWorkbook };
