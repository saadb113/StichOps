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
  bonusTotal: 'number',
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
    importable: true,
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
    columns: ['id', 'employeeId', 'slipNo', 'total', 'currency', 'baseSalary', 'commission', 'bonusTotal', 'approvedDate', 'paymentStatus']
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
    columns: ['id', 'country', 'currency', 'accountName', 'accountHolder', 'accountNo', 'sortCode', 'routingNumber', 'accountType', 'bic', 'iban', 'bsb', 'paymentAccount', 'address', 'createdAt']
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

// Import runs parents before children so foreign keys always resolve
// (orders need their customer, designer and invoice to exist first).
const IMPORT_ORDER = ['employees', 'customers', 'invoices', 'orders'];

// Fields offered on the import-mapping screen. `required` is enforced only
// when a row creates a new record. `aliases` drive auto-matching of file
// headers. `lookup` fields let a file reference a parent by name/number
// instead of by internal id — they resolve to `target` on import.
const IMPORT_FIELDS = {
  orders: [
    { key: 'id', label: 'ID' },
    { key: 'customerId', label: 'Customer ID', required: 'customer' },
    { key: 'customerName', label: 'Customer (company or code)', lookup: 'customer', target: 'customerId', aliases: ['customer', 'company', 'client', 'customer name', 'customer code'] },
    { key: 'name', label: 'Order Name', required: true, aliases: ['order', 'order name', 'order title', 'title', 'design', 'description', 'product'] },
    { key: 'date', label: 'Order Date', required: true, aliases: ['order date', 'created'] },
    { key: 'price', label: 'Price', required: true, aliases: ['amount', 'order price', 'value'] },
    { key: 'currency', label: 'Currency', required: true, aliases: ['ccy'] },
    { key: 'designerId', label: 'Designer ID', required: 'designer' },
    { key: 'designerName', label: 'Designer (name)', lookup: 'employee', target: 'designerId', aliases: ['designer', 'designer name'] },
    { key: 'productionCost', label: 'Production Cost', aliases: ['cost', 'production'] },
    { key: 'productionCostCurrency', label: 'Production Cost Currency' },
    { key: 'commissionRate', label: 'Commission Rate (%)', aliases: ['commission'] },
    { key: 'status', label: 'Status', aliases: ['order status'] },
    { key: 'commissionPaid', label: 'Commission Paid' },
    { key: 'productionPaid', label: 'Production Paid' },
    { key: 'invoiceId', label: 'Invoice ID' },
    { key: 'invoiceNo', label: 'Invoice No.', lookup: 'invoice', target: 'invoiceId', aliases: ['invoice', 'invoice number'] }
  ],
  invoices: [
    { key: 'id', label: 'ID' },
    { key: 'customerId', label: 'Customer ID', required: 'customer' },
    { key: 'customerName', label: 'Customer (company or code)', lookup: 'customer', target: 'customerId', aliases: ['customer', 'company', 'client'] },
    { key: 'invoiceNo', label: 'Invoice No.', required: true, aliases: ['invoice', 'invoice number', 'number'] },
    { key: 'version', label: 'Version' },
    { key: 'total', label: 'Total', required: true, aliases: ['amount', 'invoice total'] },
    { key: 'currency', label: 'Currency', required: true },
    { key: 'generatedDate', label: 'Generated Date', required: true, aliases: ['date', 'invoice date', 'issued'] },
    { key: 'approvedDate', label: 'Approved Date', aliases: ['approved'] },
    { key: 'paymentStatus', label: 'Payment Status', aliases: ['status', 'paid'] }
  ],
  customers: [
    { key: 'id', label: 'ID' },
    { key: 'customerCode', label: 'Customer Code', aliases: ['code'] },
    { key: 'name', label: 'Contact Name', required: true, aliases: ['contact name', 'full name', 'customer name', 'first name'] },
    { key: 'company', label: 'Company', required: true, aliases: ['company name', 'business', 'business name', 'organization'] },
    { key: 'country', label: 'Country', required: true },
    { key: 'currency', label: 'Currency', required: true },
    { key: 'address', label: 'Address', aliases: ['street', 'address 1'] },
    { key: 'zip', label: 'ZIP / Postcode', aliases: ['postcode', 'postal code', 'zip code'] },
    { key: 'email', label: 'Email', aliases: ['email address', 'e-mail'] },
    { key: 'emailClient', label: 'Email Client' },
    { key: 'contact', label: 'Phone', aliases: ['phone', 'phone number', 'mobile', 'contact number'] },
    { key: 'salespersonId', label: 'Salesperson ID' },
    { key: 'salespersonName', label: 'Salesperson (name)', lookup: 'employee', target: 'salespersonId', aliases: ['salesperson', 'sales rep', 'owner', 'assigned to'] },
    { key: 'receivedEmail', label: 'Received Email' },
    { key: 'status', label: 'Status' },
    { key: 'invoiceDay', label: 'Invoice Day' },
    { key: 'notes', label: 'Notes', aliases: ['note', 'comments'] },
    { key: 'createdAt', label: 'Created At', aliases: ['created', 'date added'] }
  ],
  employees: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name', required: true, aliases: ['full name', 'employee', 'employee name'] },
    { key: 'role', label: 'Role', required: true, aliases: ['category', 'type'] },
    { key: 'designation', label: 'Designation', aliases: ['title', 'job title', 'position'] },
    { key: 'currency', label: 'Currency', required: true },
    { key: 'baseSalary', label: 'Base Salary', required: true, aliases: ['salary'] },
    { key: 'payoutDay', label: 'Payout Day', required: true },
    { key: 'commissionRate', label: 'Commission Rate (%)', aliases: ['commission'] },
    { key: 'email', label: 'Email', aliases: ['email address'] },
    { key: 'contact', label: 'Phone', aliases: ['phone', 'mobile', 'contact number'] },
    { key: 'createdAt', label: 'Created At', aliases: ['created'] }
  ]
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

module.exports = { MODELS, IMPORT_ORDER, IMPORT_FIELDS, coerceIn, coerceOut, prisma };
