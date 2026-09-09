const XLSX = require('xlsx');
const { MODELS, coerceOut, prisma } = require('./dataModels');

function rowsToSheet(modelKey, rows) {
  const { columns } = MODELS[modelKey];
  const plain = rows.map((row) => {
    const out = {};
    for (const col of columns) out[col] = coerceOut(col, row[col]);
    return out;
  });
  const sheet = XLSX.utils.json_to_sheet(plain, { header: columns });
  return sheet;
}

async function fetchRows(modelKey, range) {
  const model = MODELS[modelKey];
  const where = {};
  if (model.dateField && range && (range.from || range.to)) {
    where[model.dateField] = {};
    if (range.from) where[model.dateField].gte = new Date(range.from + 'T00:00:00.000Z');
    if (range.to) where[model.dateField].lte = new Date(range.to + 'T23:59:59.999Z');
  }
  return prisma[model.prismaModel].findMany({ where, orderBy: { id: 'asc' } });
}

async function exportModel(modelKey, range) {
  const rows = await fetchRows(modelKey, range);
  const sheet = rowsToSheet(modelKey, rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, MODELS[modelKey].label.slice(0, 31));
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function exportAll(range) {
  const workbook = XLSX.utils.book_new();
  for (const modelKey of Object.keys(MODELS)) {
    const rows = await fetchRows(modelKey, range);
    const sheet = rowsToSheet(modelKey, rows);
    XLSX.utils.book_append_sheet(workbook, sheet, MODELS[modelKey].label.slice(0, 31));
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { exportModel, exportAll };
