// Shared Prisma `include` shapes so every route pulls in exactly what its
// serializer (src/lib/serialize.js) needs.

const customerInclude = { salesperson: true };

const orderInclude = {
  designer: true,
  comments: { orderBy: { id: 'asc' } }
};

const employeeInclude = { companyEmails: true, user: true };

const invoiceInclude = { orders: true };

const payslipInclude = { commissionOrders: true, productionOrders: true };

module.exports = { customerInclude, orderInclude, employeeInclude, invoiceInclude, payslipInclude };
