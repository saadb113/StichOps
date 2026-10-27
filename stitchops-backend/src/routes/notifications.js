const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { addClient, removeClient, safeWrite } = require('../lib/sse');
const { checkDueDates } = require('../lib/dueDates');
const { runMonthlyInvoicing } = require('../lib/monthlyInvoicing');
const { checkSlipsReady } = require('../lib/monthlySlipNotify');

const router = express.Router();

// Live push channel — the topbar bell subscribes to this and gets each new
// notification the instant it's created, instead of polling.
router.get('/stream', requireAuth, requireAdmin, (req, res) => {
  runBackgroundChecks();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  addClient(res);
  safeWrite(res, 'retry: 3000\n\n');

  let keepAlive = null;
  const cleanup = () => {
    clearInterval(keepAlive);
    removeClient(res);
  };
  keepAlive = setInterval(() => { if (!safeWrite(res, ': ping\n\n')) cleanup(); }, 25000);

  // Without an 'error' listener, a socket error on this long-lived response
  // is an unhandled 'error' event — which kills the whole Node process.
  res.on('error', cleanup);
  req.on('error', cleanup);
  req.on('close', cleanup);
});

// Background checks must never stop the bell from loading — log and move on.
async function runBackgroundChecks() {
  for (const [name, fn] of [['due dates', checkDueDates], ['monthly invoicing', runMonthlyInvoicing], ['slip notify', checkSlipsReady]]) {
    try {
      await fn();
    } catch (err) {
      console.error(`Background check failed (${name}):`, err);
    }
  }
}

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await runBackgroundChecks();
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
