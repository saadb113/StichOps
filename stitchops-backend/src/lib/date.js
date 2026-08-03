// All "date-only" fields (order date, invoice dates, comment date, ...) are
// stored as Postgres DATE columns and travel over the wire as plain
// "YYYY-MM-DD" strings, matching what the frontend already expects.
// We always anchor to UTC midnight so no local timezone ever shifts the day.

function parseDateOnly(str) {
  return new Date(str + 'T00:00:00.000Z');
}

function toDateOnlyString(date) {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

function today() {
  return toDateOnlyString(new Date());
}

module.exports = { parseDateOnly, toDateOnlyString, today };
