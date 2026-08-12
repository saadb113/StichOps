const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { serializeCustomer } = require('../lib/serialize');
const { customerInclude } = require('../lib/includes');
const { createCustomerSchema, updateCustomerSchema } = require('../schemas/customer');

const router = express.Router();

async function resolveSalesperson(name) {
  const employee = await prisma.employee.findFirst({ where: { name, role: 'Salesperson' } });
  if (!employee) {
    const err = new Error(`No salesperson named "${name}" was found.`);
    err.status = 400;
    throw err;
  }
  return employee;
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const where = req.user.role === 'SALESPERSON' ? { salespersonId: req.user.employeeId } : {};
  const customers = await prisma.customer.findMany({ where, include: customerInclude, orderBy: { id: 'asc' } });
  res.json(customers.map(serializeCustomer));
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const customer = await prisma.customer.findUnique({ where: { id }, include: customerInclude });
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });
  if (req.user.role === 'SALESPERSON' && customer.salespersonId !== req.user.employeeId) {
    return res.status(403).json({ error: 'Not your customer.' });
  }
  res.json(serializeCustomer(customer));
}));

router.post('/', requireAuth, validateBody(createCustomerSchema), asyncHandler(async (req, res) => {
  const body = req.body;
  const isSales = req.user.role === 'SALESPERSON';

  let salespersonName = body.salesperson;
  if (isSales) {
    const me = await prisma.employee.findUnique({ where: { id: req.user.employeeId } });
    salespersonName = me.name;
  }
  const salesperson = await resolveSalesperson(salespersonName);

  const customerCode = isSales ? null : (body.customerCode || null);
  if (customerCode) {
    const clash = await prisma.customer.findUnique({ where: { customerCode } });
    if (clash) return res.status(409).json({ error: 'That Customer ID is already in use — pick a different one.' });
  }

  const customer = await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        customerCode,
        name: body.name,
        company: body.company,
        country: body.country,
        currency: body.currency,
        address: body.address || '',
        zip: body.zip || '',
        email: body.email || '',
        emailClient: body.emailClient,
        contact: body.contact || '',
        salespersonId: salesperson.id,
        receivedEmail: isSales ? (body.receivedEmail || null) : null,
        status: 'Free Trial',
        invoiceDay: isSales ? null : (body.invoiceDay ?? null),
        notes: body.notes || ''
      },
      include: customerInclude
    });
    if (customerCode) {
      await tx.counter.update({ where: { id: 1 }, data: { nextCustomerCode: { increment: 1 } } });
    }
    return created;
  });

  res.status(201).json(serializeCustomer(customer));
}));

router.patch('/:id', requireAuth, validateBody(updateCustomerSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Customer not found.' });

  const isSales = req.user.role === 'SALESPERSON';
  if (isSales && existing.salespersonId !== req.user.employeeId) {
    return res.status(403).json({ error: 'Not your customer.' });
  }

  const data = {};
  if (isSales) {
    // Salespeople may only toggle the Free Trial / Paid status from the profile page.
    if (req.body.status) data.status = req.body.status;
  } else {
    const body = req.body;
    if (body.name !== undefined) data.name = body.name;
    if (body.company !== undefined) data.company = body.company;
    if (body.country !== undefined) data.country = body.country;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.address !== undefined) data.address = body.address;
    if (body.zip !== undefined) data.zip = body.zip;
    if (body.email !== undefined) data.email = body.email;
    if (body.emailClient !== undefined) data.emailClient = body.emailClient;
    if (body.contact !== undefined) data.contact = body.contact;
    if (body.receivedEmail !== undefined) data.receivedEmail = body.receivedEmail;
    if (body.invoiceDay !== undefined) data.invoiceDay = body.invoiceDay;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.status !== undefined) data.status = body.status;
    if (body.salesperson !== undefined) {
      const salesperson = await resolveSalesperson(body.salesperson);
      data.salespersonId = salesperson.id;
    }
    if (body.customerCode !== undefined) {
      const code = body.customerCode || null;
      if (code) {
        const clash = await prisma.customer.findFirst({ where: { customerCode: code, id: { not: id } } });
        if (clash) return res.status(409).json({ error: 'That Customer ID is already in use — pick a different one.' });
      }
      data.customerCode = code;
    }
  }

  const updated = await prisma.customer.update({ where: { id }, data, include: customerInclude });
  res.json(serializeCustomer(updated));
}));

module.exports = router;
