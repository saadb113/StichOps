const { z } = require('zod');

const ORDER_STATUSES = ['Pending', 'In progress', 'Completed', 'On hold', 'Cancelled'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'AUD', 'PKR'];

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date string.');

module.exports = { ORDER_STATUSES, CURRENCIES, dateOnly };
