const { PrismaClient } = require('@prisma/client');

// "Can't reach database server" / "connection closed" — raised before the
// query runs, so retrying can never apply a write twice. A serverless
// database (Neon) waking from idle often fails the first attempt like this.
const RETRYABLE = new Set(['P1001', 'P1002', 'P1017']);
const DELAYS_MS = [500, 1500, 3000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const base = new PrismaClient();

const prisma = base.$extends({
  query: {
    async $allOperations({ args, query }) {
      for (let attempt = 0; ; attempt++) {
        try {
          return await query(args);
        } catch (err) {
          // Request errors carry `code`; connection-init errors carry `errorCode`.
          const code = err?.code || err?.errorCode || err?.name;
          const retryable = RETRYABLE.has(code) || err?.name === 'PrismaClientInitializationError';
          if (!retryable || attempt >= DELAYS_MS.length) throw err;
          console.warn(`Database unreachable (${code}) — retrying in ${DELAYS_MS[attempt]}ms...`);
          await sleep(DELAYS_MS[attempt]);
        }
      }
    }
  }
});

module.exports = prisma;
