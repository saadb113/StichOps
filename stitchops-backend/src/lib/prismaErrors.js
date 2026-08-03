// Prisma surfaces FK-violation-on-delete differently depending on whether the
// violation was caught by Prisma's own relation-mode emulation (a
// PrismaClientKnownRequestError with code P2003/P2014) or by the underlying
// Postgres RESTRICT constraint itself (a PrismaClientUnknownRequestError with
// no `.code` at all, just a message mentioning the constraint). Callers that
// only checked `e.code === 'P2003'` missed the latter, far more common case.
function isForeignKeyViolation(e) {
  if (!e) return false;
  if (e.code === 'P2003' || e.code === 'P2014') return true;
  const msg = String(e.message || '');
  return /foreign key constraint/i.test(msg) || /violates .* constraint/i.test(msg);
}

module.exports = { isForeignKeyViolation };
