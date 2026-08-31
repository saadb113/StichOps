const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { addClient, removeClient } = require('../lib/sse');

const router = express.Router();

// Live push channel — the topbar bell subscribes to this and gets each new
// notification the instant it's created, instead of polling.
router.get('/stream', requireAuth, requireAdmin, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 3000\n\n');
  addClient(res);

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    removeClient(res);
  });
});

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({ orderBy: { id: 'desc' }, take: 10 });
  res.json(notifications);
}));

router.patch('/:id/read', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Notification not found.' });
  const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
  res.json(updated);
}));

router.post('/read-all', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
  res.json({ ok: true });
}));

module.exports = router;
