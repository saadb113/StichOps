const prisma = require('../lib/prisma');
const { COOKIE_NAME, verifyToken } = require('../lib/jwt');

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Session expired — please log in again.' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
  next();
}

function requireSalesperson(req, res, next) {
  if (req.user.role !== 'SALESPERSON') return res.status(403).json({ error: 'Salesperson access required.' });
  next();
}

module.exports = { requireAuth, requireAdmin, requireSalesperson };
