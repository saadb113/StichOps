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

module.exports = { fetchMarketRate };
