// Central definition of which Prisma models can be exported/imported via the
// Settings > System Data screen, what columns each sheet has, and how to
// coerce each column's cell value back to the right JS type on import.
// Deliberately hand-listed (not reflected off the Prisma schema) so we never
// accidentally export something sensitive (e.g. User.passwordHash) just
// because a field gets added to the schema later.

const prisma = require('./prisma');

const TYPES = {
  id: 'number',
  customerId: 'number',
  designerId: 'number',
  salespersonId: 'number',
  employeeId: 'number',
  invoiceId: 'number',
  commissionPayslipId: 'number',
  productionPayslipId: 'number',
  price: 'number',
  productionCost: 'number',
  commissionRate: 'number',
  baseSalary: 'number',
  payoutDay: 'number',
  invoiceDay: 'number',
  total: 'number',
  commission: 'number',
  rate: 'number',
  version: 'number',
  commissionPaid: 'boolean',
  productionPaid: 'boolean',
  mustChangePassword: 'boolean',
  welcomed: 'boolean',
  isCustom: 'boolean',
  read: 'boolean',
  date: 'date',
  generatedDate: 'date',
  approvedDate: 'date',
  requestedAt: 'date',
  createdAt: 'date',
  updatedAt: 'date'
};

// `importable: true` models appear in the Upload Data table. Every model
// listed here appears in the "Export all Data" workbook; only the ones with
// a `dateField` get a per-row date-range picker in the Export Data table.
const MODELS = {
  orders: {
    label: 'Orders',
    prismaModel: 'order',
    dateField: 'date',
    importable: true,
    columns: ['id', 'customerId', 'name', 'date', 'price', 'currency', 'designerId', 'productionCost', 'productionCostCurrency', 'commissionRate', 'status', 'commissionPaid', 'productionPaid', 'invoiceId']
  },
  invoices: {
    label: 'Invoices',
    prismaModel: 'invoice',
    dateField: 'generatedDate',
    importable: false,
    columns: ['id', 'customerId', 'invoiceNo', 'version', 'total', 'currency', 'generatedDate', 'approvedDate', 'paymentStatus']
  },
  customers: {
    label: 'Customers',
    prismaModel: 'customer',
    dateField: 'createdAt',
    importable: true,
    columns: ['id', 'customerCode', 'name', 'company', 'country', 'currency', 'address', 'zip', 'email', 'emailClient', 'contact', 'salespersonId', 'receivedEmail', 'status', 'invoiceDay', 'notes', 'createdAt']
  },
  employees: {
    label: 'Employees',
    prismaModel: 'employee',
    dateField: 'createdAt',
    importable: true,
    columns: ['id', 'name', 'role', 'designation', 'currency', 'baseSalary', 'payoutDay', 'commissionRate', 'email', 'contact', 'createdAt']
  },
  users: {
    label: 'Users',
    prismaModel: 'user',
    dateField: 'createdAt',
    importable: false,
    // passwordHash is intentionally excluded — never export credential data.
    columns: ['id', 'email', 'role', 'employeeId', 'mustChangePassword', 'welcomed', 'createdAt']
  },
  payslips: {
    label: 'Payslips',
    prismaModel: 'payslip',
    dateField: 'approvedDate',
    importable: false,
    columns: ['id', 'employeeId', 'slipNo', 'total', 'currency', 'baseSalary', 'commission', 'approvedDate', 'paymentStatus']
  },
  notifications: {
    label: 'Notifications',
    prismaModel: 'notification',
    dateField: 'createdAt',
    importable: false,
    columns: ['id', 'type', 'message', 'link', 'employeeId', 'read', 'createdAt']
  },
  passwordResetRequests: {
    label: 'Password Reset Requests',
    prismaModel: 'passwordResetRequest',
    dateField: 'requestedAt',
    importable: false,
    columns: ['id', 'email', 'employeeId', 'requestedAt']
  },
  bankAccounts: {
    label: 'Bank Accounts',
    prismaModel: 'bankAccount',
    dateField: 'createdAt',
    importable: false,
    columns: ['id', 'currency', 'accountName', 'accountNo', 'createdAt']
  },
  currencyRates: {
    label: 'Currency Rates',
    prismaModel: 'currencyRate',
    dateField: null,
    importable: false,
    columns: ['id', 'currency', 'rate', 'isCustom']
  },
  employeeCategories: {
    label: 'Employee Categories',
    prismaModel: 'employeeCategory',
    dateField: null,
    importable: false,
    columns: ['id', 'name']
  },
  company: {
    label: 'Company',
    prismaModel: 'company',
    dateField: null,
    importable: false,
    columns: ['id', 'name', 'address', 'email', 'contact', 'defaultCurrency', 'logo']
  }
};

function coerceIn(col, value) {
  if (value === undefined || value === null || value === '') return null;
  const type = TYPES[col];
  if (type === 'number') {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    const s = String(value).trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }
  if (type === 'date') {
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return String(value);
}

function coerceOut(col, value) {
  const type = TYPES[col];
  if (type === 'date' && value instanceof Date) return value;
  return value;
}

module.exports = { MODELS, coerceIn, coerceOut, prisma };
