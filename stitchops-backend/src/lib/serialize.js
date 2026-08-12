const { toDateOnlyString } = require('./date');

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role.toLowerCase(),
    employeeId: user.employeeId,
    mustChangePassword: user.mustChangePassword,
    welcomed: user.welcomed
  };
}

function serializeEmployee(employee) {
  return {
    id: employee.id,
    name: employee.name,
    role: employee.role,
    designation: employee.designation || '',
    currency: employee.currency,
    baseSalary: employee.baseSalary,
    payoutDay: employee.payoutDay,
    email: employee.email || '',
    contact: employee.contact || '',
    emails: (employee.companyEmails || []).map((ce) => ce.email),
    hasLogin: !!employee.user
  };
}

function serializeCustomer(customer) {
  return {
    id: customer.id,
    customerCode: customer.customerCode,
    name: customer.name,
    company: customer.company,
    country: customer.country,
    currency: customer.currency,
    address: customer.address || '',
    zip: customer.zip || '',
    email: customer.email,
    emailClient: customer.emailClient,
    contact: customer.contact,
    salesperson: customer.salesperson.name,
    receivedEmail: customer.receivedEmail,
    status: customer.status,
    invoiceDay: customer.invoiceDay,
    notes: customer.notes
  };
}

function serializeOrder(order) {
  return {
    id: order.id,
    customerId: order.customerId,
    name: order.name,
    date: toDateOnlyString(order.date),
    price: order.price,
    currency: order.currency,
    designer: order.designer.name,
    productionCost: order.productionCost,
    productionCostCurrency: order.productionCostCurrency,
    commissionRate: order.commissionRate,
    status: order.status,
    invoiced: order.invoiceId != null,
    commissionPaid: order.commissionPaid,
    productionPaid: order.productionPaid,
    comments: (order.comments || []).map(serializeComment)
  };
}

function serializeComment(comment) {
  return {
    id: comment.id,
    author: comment.author,
    date: toDateOnlyString(comment.date),
    text: comment.text
  };
}

function serializeInvoice(invoice) {
  return {
    id: invoice.id,
    customerId: invoice.customerId,
    invoiceNo: invoice.invoiceNo,
    version: invoice.version,
    status: 'approved',
    orderIds: (invoice.orders || []).map((o) => o.id),
    total: invoice.total,
    currency: invoice.currency,
    generatedDate: toDateOnlyString(invoice.generatedDate),
    approvedDate: toDateOnlyString(invoice.approvedDate),
    paymentStatus: invoice.paymentStatus
  };
}

function serializePayslip(payslip) {
  const orderIds = [
    ...(payslip.commissionOrders || []).map((o) => o.id),
    ...(payslip.productionOrders || []).map((o) => o.id)
  ];
  return {
    id: payslip.id,
    employeeId: payslip.employeeId,
    slipNo: payslip.slipNo,
    total: payslip.total,
    currency: payslip.currency,
    baseSalary: payslip.baseSalary,
    commission: payslip.commission,
    approvedDate: toDateOnlyString(payslip.approvedDate),
    paymentStatus: payslip.paymentStatus,
    orderIds
  };
}

function serializePasswordResetRequest(req) {
  return {
    id: req.id,
    email: req.email,
    employeeId: req.employeeId,
    requestedAt: toDateOnlyString(req.requestedAt)
  };
}

function serializeCompany(company) {
  return {
    name: company.name,
    address: company.address,
    email: company.email || '',
    contact: company.contact || '',
    defaultCurrency: company.defaultCurrency
  };
}

function serializeBankAccount(account) {
  return {
    id: account.id,
    currency: account.currency,
    accountName: account.accountName || '',
    accountNo: account.accountNo || ''
  };
}

function serializeCurrencyRate(rate) {
  return {
    id: rate.id,
    currency: rate.currency,
    rate: rate.rate,
    isCustom: rate.isCustom
  };
}

module.exports = {
  serializeUser,
  serializeEmployee,
  serializeCustomer,
  serializeOrder,
  serializeComment,
  serializeInvoice,
  serializePayslip,
  serializePasswordResetRequest,
  serializeCompany,
  serializeBankAccount,
  serializeCurrencyRate
};
