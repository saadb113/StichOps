require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

// Wipes every business-data table and leaves only a single admin login.
// Run this ONCE, manually, against the target database — it is destructive
// and irreversible (see README note below / chat instructions).
async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@theelegantsdesign.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  console.log('Wiping existing data...');

  // Children first, respecting foreign keys.
  await prisma.payslipBonus.deleteMany({});
  await prisma.orderComment.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.passwordResetRequest.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.companyEmail.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.bankAccount.deleteMany({});
  await prisma.currencyRate.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.counter.deleteMany({});

  console.log('Seeding admin-only data...');

  for (const name of ['Salesperson', 'Designer']) {
    await prisma.employeeCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  await prisma.counter.create({
    data: { id: 1, nextInvoiceNo: 1, nextCustomerCode: 1001 }
  });

  await prisma.company.create({
    data: {
      id: 1,
      name: 'The Elegants Design',
      address: '',
      email: '',
      contact: '',
      defaultCurrency: 'PKR'
    }
  });

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: await hash(adminPassword),
      role: 'ADMIN',
      employeeId: null,
      mustChangePassword: false,
      welcomed: true
    }
  });

  console.log(`Done. Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
