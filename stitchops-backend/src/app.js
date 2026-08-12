require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const invoiceRoutes = require('./routes/invoices');
const employeeRoutes = require('./routes/employees');
const employeeCategoryRoutes = require('./routes/employeeCategories');
const payslipRoutes = require('./routes/payslips');
const passwordResetRequestRoutes = require('./routes/passwordResetRequests');
const companyRoutes = require('./routes/company');
const companyEmailRoutes = require('./routes/companyEmails');
const bankAccountRoutes = require('./routes/bankAccounts');
const currencyRateRoutes = require('./routes/currencyRates');
const metaRoutes = require('./routes/meta');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/employee-categories', employeeCategoryRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/password-reset-requests', passwordResetRequestRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/company-emails', companyEmailRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/currency-rates', currencyRateRoutes);
app.use('/api/meta', metaRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  // Only ever surface our own intentional 4xx messages to the client — a 500
  // means something unexpected (a DB blip, a bug) and its details stay server-side.
  const message = status < 500 ? (err.message || 'Something went wrong.') : 'Something went wrong on our end. Please try again.';
  res.status(status).json({ error: message });
});

module.exports = app;
