// This machine's default DNS resolver (its router at 192.168.0.1) intermittently
// fails to resolve the Neon hostname even though public resolvers handle it fine,
// which surfaces as PrismaClientInitializationError "Can't reach database server".
// Point Node's resolver at public DNS servers so the app doesn't depend on the
// router's flaky forwarding for this one record.
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);

const app = require('./app');

// Safety net: a stray unhandled rejection (e.g. a promise that slipped past
// asyncHandler) should be logged, not take the whole API down.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`StitchOps API listening on http://localhost:${port}`);
});
