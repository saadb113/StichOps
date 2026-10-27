// This machine's default DNS resolver (its router at 192.168.0.1) intermittently
// fails to resolve the Neon hostname even though public resolvers handle it fine,
// which surfaces as PrismaClientInitializationError "Can't reach database server".
// Point Node's resolver at public DNS servers so the app doesn't depend on the
// router's flaky forwarding for this one record.
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);

const app = require('./app');
const prisma = require('./lib/prisma');

// Safety nets: a stray error from a timer, socket or promise that slipped
// past asyncHandler is logged instead of taking the whole API down.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const port = process.env.PORT || 4000;

const server = app.listen(port, () => {
  console.log(`ElegantsDesign API listening on http://localhost:${port}`);
});

// Keep idle connections open longer than nginx's upstream keepalive so the
// proxy never reuses a socket Node has already closed (random 502s).
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('error', (err) => {
  console.error('HTTP server error:', err);
  if (err.code === 'EADDRINUSE') process.exit(1);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down gracefully...`);
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  // Live notification streams never close on their own — don't wait forever.
  setTimeout(() => process.exit(0), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
