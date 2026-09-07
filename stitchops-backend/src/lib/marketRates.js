// Live currency conversion via exchangerate-api.com, cached in-memory to stay
// well under the free-tier request quota.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map(); // `${from}_${to}` -> { rate, expiresAt }

async function fetchMarketRate(from, to) {
  const key = `${from}_${to}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.rate;

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    const err = new Error('Market rates are not configured on the server.');
    err.status = 503;
    throw err;
  }

  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`;
  let res, data;
  try {
    res = await fetch(url);
    data = await res.json();
  } catch {
    const err = new Error('Could not reach the market rate provider.');
    err.status = 502;
    throw err;
  }

  if (!res.ok || data.result !== 'success') {
    const err = new Error(`Market rate lookup failed${data && data['error-type'] ? `: ${data['error-type']}` : '.'}`);
    err.status = 502;
    throw err;
  }

  const rate = data.conversion_rate;
  cache.set(key, { rate, expiresAt: Date.now() + CACHE_TTL_MS });
  return rate;
}

const RATE_STALE_MS = 24 * 60 * 60 * 1000;
let inFlightRefresh = null;

// There's no cron/scheduler in this app, so non-custom currency rates are
// refreshed reactively — whenever the rates list loads (see
// routes/currencyRates.js) — for any row whose updatedAt is more than a day
// old. Custom (admin-pinned) rates are left alone. The in-flight guard
// mirrors lib/dueDates.js: concurrent callers (e.g. two tabs loading at
// once) share one refresh instead of racing duplicate market-rate calls.
function refreshStaleRates(prisma) {
  if (!inFlightRefresh) inFlightRefresh = runRefresh(prisma).finally(() => { inFlightRefresh = null; });
  return inFlightRefresh;
}

async function runRefresh(prisma) {
  const company = await prisma.company.findUnique({ where: { id: 1 } });
  const base = company?.defaultCurrency || 'PKR';
  const cutoff = new Date(Date.now() - RATE_STALE_MS);
  const stale = await prisma.currencyRate.findMany({
    where: { isCustom: false, currency: { not: base }, updatedAt: { lt: cutoff } }
  });
  for (const row of stale) {
    try {
      const rate = await fetchMarketRate(row.currency, base);
      await prisma.currencyRate.update({ where: { currency: row.currency }, data: { rate } });
    } catch {
      // Provider hiccup or missing API key — leave the existing rate in
      // place and try again next time the list loads.
    }
  }
}

module.exports = { fetchMarketRate, refreshStaleRates };
