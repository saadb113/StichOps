const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'stitchops_token';
const REMEMBER_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signToken(payload, remember) {
  const expiresIn = remember ? '30d' : '1d';
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function cookieOptions(remember) {
  const opts = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/'
  };
  if (remember) opts.maxAge = REMEMBER_MAX_AGE_MS;
  return opts;
}

module.exports = { COOKIE_NAME, signToken, verifyToken, cookieOptions };
