const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function genTempPassword() {
  return 'Temp-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

module.exports = { hashPassword, comparePassword, genTempPassword };
