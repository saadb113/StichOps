require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  const alreadySeeded = await prisma.user.count();
  if (alreadySeeded > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }
  console.log('Seeding...');

  await prisma.counter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nextInvoiceNo: 232, nextCustomerCode: 1005 }
  });

  await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'The Elegants Design',
      address: '14 Riverside Yard, Manchester, UK',
      email: 'shaheerbaig@gmail.com',
      contact: '+92 313 2799726',
      defaultCurrency: 'PKR'
    }
  });

  const bankAccountSeed = [
    { currency: 'GBP', accountName: 'The Elegants Design', accountNo: 'IBAN GB29 NWBK 6016 1331 9268 19' },
    { currency: 'USD', accountName: 'The Elegants Design', accountNo: 'ACC 004512398, Routing 026009593' },
    { currency: 'EUR', accountName: 'The Elegants Design', accountNo: 'IBAN DE89 3704 0044 0532 0130 00' },
    { currency: 'AUD', accountName: 'The Elegants Design', accountNo: 'BSB 062-000, ACC 1122 3344' }
  ];
  for (const account of bankAccountSeed) {
    await prisma.bankAccount.create({ data: account });
  }

  const currencyRateSeed = [
    { currency: 'USD', rate: 276.89 },
    { currency: 'EUR', rate: 319.44 },
    { currency: 'GBP', rate: 374.10 },
    { currency: 'AUD', rate: 195.25 }
  ];
  for (const rate of currencyRateSeed) {
    await prisma.currencyRate.create({ data: rate });
  }

  for (const name of ['Salesperson', 'Designer']) {
    await prisma.employeeCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  const ayesha = await prisma.employee.create({
    data: { name: 'Ayesha Khan', role: 'Salesperson', designation: 'Senior Account Executive', currency: 'GBP', baseSalary: 1200, payoutDay: 28, email: 'ayesha.khan@stitchops.com' }
  });
  const daniyal = await prisma.employee.create({
    data: { name: 'Daniyal Raza', role: 'Salesperson', designation: 'Account Executive', currency: 'PKR', baseSalary: 180000, payoutDay: 28, email: 'daniyal.raza@stitchops.com' }
  });
  const rehan = await prisma.employee.create({
    data: { name: 'Rehan Iqbal', role: 'Designer', designation: 'Senior Digitizer', currency: 'GBP', baseSalary: 900, payoutDay: 25, email: 'rehan.iqbal@stitchops.com' }
  });
  const sana = await prisma.employee.create({
    data: { name: 'Sana Malik', role: 'Designer', designation: 'Digitizer', currency: 'GBP', baseSalary: 950, payoutDay: 25, email: 'sana.malik@stitchops.com' }
  });

  const companyEmailSeed = [
    ['ayesha.khan@stitchops.com', ayesha.id],
    ['ayesha.sales1@stitchops.com', ayesha.id],
    ['ayesha.sales2@stitchops.com', ayesha.id],
    ['daniyal.raza@stitchops.com', daniyal.id],
    ['daniyal.sales@stitchops.com', daniyal.id],
    ['info@stitchops.com', null],
    ['leads@stitchops.com', null]
  ];
  for (const [email, employeeId] of companyEmailSeed) {
    await prisma.companyEmail.create({ data: { email, employeeId } });
  }

  await prisma.user.create({
    data: { email: 'admin@stitchops.com', passwordHash: await hash('admin123'), role: 'ADMIN', employeeId: null, mustChangePassword: false, welcomed: true }
  });
  await prisma.user.create({
    data: { email: 'ayesha.khan@stitchops.com', passwordHash: await hash('Temp-7F2A'), role: 'SALESPERSON', employeeId: ayesha.id, mustChangePassword: true, welcomed: false }
  });
  await prisma.user.create({
    data: { email: 'daniyal.raza@stitchops.com', passwordHash: await hash('Temp-9K3L'), role: 'SALESPERSON', employeeId: daniyal.id, mustChangePassword: true, welcomed: false }
  });

  const d = (s) => new Date(s + 'T00:00:00.000Z');

  const northbridge = await prisma.customer.create({
    data: { customerCode: 'CUST-1001', name: 'James Whitfield', company: 'Northbridge Retail Ltd', country: 'United Kingdom', currency: 'GBP', email: 'james@northbridge.co.uk', emailClient: 'Outlook', contact: '+44 7700 900123', salespersonId: ayesha.id, receivedEmail: 'ayesha.khan@stitchops.com', status: 'Paid', invoiceDay: 5, notes: 'Prefers PNG proofs before approval.' }
  });
  const solaris = await prisma.customer.create({
    data: { customerCode: 'CUST-1002', name: 'Carla Mendes', company: 'Solaris Apparel Co', country: 'United States', currency: 'USD', email: 'carla@solarisapparel.com', emailClient: 'Gmail', contact: '+1 305 555 0142', salespersonId: daniyal.id, receivedEmail: 'daniyal.sales@stitchops.com', status: 'Paid', invoiceDay: 1, notes: '' }
  });
  const fischer = await prisma.customer.create({
    data: { customerCode: 'CUST-1003', name: 'Hannah Fischer', company: 'Fischer & Bloom Textiles', country: 'Germany', currency: 'EUR', email: 'hannah@fischerbloom.de', emailClient: 'Outlook', contact: '+49 176 55501234', salespersonId: ayesha.id, receivedEmail: 'ayesha.khan@stitchops.com', status: 'Paid', invoiceDay: 28, notes: 'Bulk orders, always check thread count.' }
  });
  const southport = await prisma.customer.create({
    data: { customerCode: 'CUST-1004', name: "Liam O'Rourke", company: 'Southport Uniforms', country: 'Australia', currency: 'AUD', email: 'liam@southportuniforms.au', emailClient: 'Gmail', contact: '+61 4 1234 5678', salespersonId: daniyal.id, receivedEmail: null, status: 'Free Trial', invoiceDay: 15, notes: '' }
  });

  const invoice0231 = await prisma.invoice.create({
    data: { customerId: northbridge.id, invoiceNo: 'INV-0231', version: 1, total: 480, currency: 'GBP', generatedDate: d('2026-05-01'), approvedDate: d('2026-05-01'), paymentStatus: 'Pending' }
  });

  const order101 = await prisma.order.create({
    data: { customerId: northbridge.id, name: 'Autumn Polo Batch', date: d('2026-06-04'), price: 480, currency: 'GBP', designerId: rehan.id, productionCost: 90, commissionRate: 10, status: 'Completed', invoiceId: invoice0231.id }
  });
  const order102 = await prisma.order.create({
    data: { customerId: northbridge.id, name: 'Staff Jacket Logo Set', date: d('2026-06-19'), price: 610, currency: 'GBP', designerId: rehan.id, productionCost: 120, commissionRate: 10, status: 'Completed' }
  });
  await prisma.order.create({
    data: { customerId: northbridge.id, name: 'Warehouse Cap Redesign', date: d('2026-07-02'), price: 220, currency: 'GBP', designerId: sana.id, productionCost: 40, commissionRate: 10, status: 'Pending' }
  });
  await prisma.order.create({
    data: { customerId: solaris.id, name: 'Summer Tee Drop', date: d('2026-06-11'), price: 950, currency: 'USD', designerId: sana.id, productionCost: 180, commissionRate: 10, status: 'Completed' }
  });
  await prisma.order.create({
    data: { customerId: solaris.id, name: 'Retail Tag Patches', date: d('2026-06-27'), price: 340, currency: 'USD', designerId: rehan.id, productionCost: 60, commissionRate: 12, status: 'Completed' }
  });
  const order106 = await prisma.order.create({
    data: { customerId: fischer.id, name: 'Q3 Corporate Set', date: d('2026-06-08'), price: 1200, currency: 'EUR', designerId: sana.id, productionCost: 210, commissionRate: 10, status: 'Completed' }
  });
  await prisma.order.create({
    data: { customerId: southport.id, name: 'School Uniform Crest', date: d('2026-06-30'), price: 530, currency: 'AUD', designerId: rehan.id, productionCost: 95, commissionRate: 10, status: 'Pending' }
  });
  await prisma.order.create({
    data: { customerId: solaris.id, name: 'Fall Collection Tags', date: new Date(), price: 410, currency: 'USD', designerId: sana.id, productionCost: 70, commissionRate: 10, status: 'Completed' }
  });

  await prisma.orderComment.create({ data: { orderId: order102.id, author: 'Ayesha Khan', date: d('2026-06-20'), text: 'Client asked for the logo slightly larger on the left chest placement.' } });
  await prisma.orderComment.create({ data: { orderId: order102.id, author: 'Rehan Iqbal', date: d('2026-06-21'), text: 'Updated the digitizing file, resent proof for approval.' } });
  await prisma.orderComment.create({ data: { orderId: order106.id, author: 'Sana Malik', date: d('2026-06-09'), text: 'Thread count confirmed with client — proceeding to production.' } });

  await prisma.payslip.create({
    data: { employeeId: ayesha.id, slipNo: 'SLIP-101', total: 1394, currency: 'GBP', baseSalary: 1200, commission: 194, approvedDate: d('2026-06-28') }
  });
  await prisma.payslip.create({
    data: { employeeId: ayesha.id, slipNo: 'SLIP-108', total: 1261, currency: 'GBP', baseSalary: 1200, commission: 61, approvedDate: d('2026-05-28') }
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
