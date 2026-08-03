const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { serializeEmployee, serializePayslip } = require('../lib/serialize');
const { employeeInclude } = require('../lib/includes');
const { createEmployeeSchema, updateEmployeeSchema } = require('../schemas/employee');
const { hashPassword, genTempPassword } = require('../lib/password');
const { commissionAmt } = require('../lib/business');
const { parseDateOnly, today } = require('../lib/date');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const employees = await prisma.employee.findMany({ include: employeeInclude, orderBy: { id: 'asc' } });
  res.json(employees.map(serializeEmployee));
}));

router.post('/', requireAuth, requireAdmin, validateBody(createEmployeeSchema), asyncHandler(async (req, res) => {
  const body = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        name: body.name,
        role: body.role,
        designation: body.designation || null,
        email: body.email || null,
        currency: body.currency,
        baseSalary: body.baseSalary,
        payoutDay: body.payoutDay
      }
    });

    if (body.emails && body.emails.length) {
      await tx.companyEmail.updateMany({
        where: { email: { in: body.emails }, employeeId: null },
        data: { employeeId: employee.id }
      });
    }

    let credentials = null;
    let needsEmailWarning = false;
    if (employee.role === 'Salesperson') {
      if (!body.email) {
        needsEmailWarning = true;
      } else {
        const clash = await tx.user.findUnique({ where: { email: body.email.toLowerCase() } });
        if (clash) {
          const err = new Error('A login with that email already exists.');
          err.status = 409;
          throw err;
        }
        const tempPw = genTempPassword();
        const passwordHash = await hashPassword(tempPw);
        const user = await tx.user.create({
          data: { email: body.email.toLowerCase(), passwordHash, role: 'SALESPERSON', employeeId: employee.id, mustChangePassword: true, welcomed: false }
        });
        credentials = { name: employee.name, email: user.email, tempPw };
      }
    }

    const full = await tx.employee.findUnique({ where: { id: employee.id }, include: employeeInclude });
    return { employee: full, credentials, needsEmailWarning };
  });

  res.status(201).json({
    employee: serializeEmployee(result.employee),
    credentials: result.credentials,
    needsEmailWarning: result.needsEmailWarning
  });
}));

router.patch('/:id', requireAuth, requireAdmin, validateBody(updateEmployeeSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Employee not found.' });

  const body = req.body;
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.role !== undefined) data.role = body.role;
  if (body.designation !== undefined) data.designation = body.designation;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.currency !== undefined) data.currency = body.currency;
  if (body.baseSalary !== undefined) data.baseSalary = body.baseSalary;
  if (body.payoutDay !== undefined) data.payoutDay = body.payoutDay;

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({ where: { id }, data });

    if (body.email !== undefined && body.email) {
      const user = await tx.user.findUnique({ where: { employeeId: id } });
      if (user) await tx.user.update({ where: { id: user.id }, data: { email: body.email.toLowerCase() } });
    }

    if (body.emails !== undefined) {
      await tx.companyEmail.updateMany({ where: { employeeId: id }, data: { employeeId: null } });
      if (body.emails.length) {
        await tx.companyEmail.updateMany({
          where: { email: { in: body.emails }, employeeId: null },
          data: { employeeId: id }
        });
      }
    }
  });

  const updated = await prisma.employee.findUnique({ where: { id }, include: employeeInclude });
  res.json(serializeEmployee(updated));
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Employee not found.' });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { employeeId: id } });
      await tx.employee.delete({ where: { id } });
    });
  } catch (e) {
    if (e.code === 'P2003') {
      return res.status(409).json({ error: `Can't delete ${existing.name} — they still have assigned customers or orders. Reassign those first.` });
    }
    throw e;
  }
  res.json({ ok: true });
}));

router.post('/:id/regenerate-credentials', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return res.status(404).json({ error: 'Employee not found.' });
  const user = await prisma.user.findUnique({ where: { employeeId: id } });
  if (!user) return res.status(400).json({ error: 'This employee has no login yet.' });

  const tempPw = genTempPassword();
  const passwordHash = await hashPassword(tempPw);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: true } });

  res.json({ name: employee.name, email: user.email, tempPw });
}));

router.post('/:id/approve-slip', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return res.status(404).json({ error: 'Employee not found.' });

  const isSales = employee.role === 'Salesperson';
  const isDesigner = employee.role === 'Designer';

  const eligible = isSales
    ? await prisma.order.findMany({ where: { customer: { salespersonId: id }, status: 'Completed', commissionPaid: false } })
    : isDesigner
      ? await prisma.order.findMany({ where: { designerId: id, status: 'Completed', productionPaid: false } })
      : [];

  const variableTotal = eligible.reduce((s, o) => s + (isSales ? commissionAmt(o) : o.productionCost), 0);
  const total = employee.baseSalary + variableTotal;
  const todayDate = parseDateOnly(today());

  const payslip = await prisma.$transaction(async (tx) => {
    const count = await tx.payslip.count();
    const slipNo = 'SLIP-' + String(100 + count + 1);
    const created = await tx.payslip.create({
      data: {
        employeeId: id,
        slipNo,
        total,
        currency: employee.currency,
        baseSalary: employee.baseSalary,
        commission: variableTotal,
        approvedDate: todayDate
      }
    });

    if (eligible.length) {
      await tx.order.updateMany({
        where: { id: { in: eligible.map((o) => o.id) } },
        data: isSales
          ? { commissionPaid: true, commissionPayslipId: created.id }
          : { productionPaid: true, productionPayslipId: created.id }
      });
    }

    return tx.payslip.findUnique({ where: { id: created.id }, include: { commissionOrders: true, productionOrders: true } });
  });

  res.status(201).json(serializePayslip(payslip));
}));

router.patch('/:id/earnings/:customerId/toggle-paid', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const customerId = Number(req.params.customerId);
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return res.status(404).json({ error: 'Employee not found.' });

  const isSales = employee.role === 'Salesperson';
  const isDesigner = employee.role === 'Designer';
  const where = isSales
    ? { customer: { salespersonId: id }, customerId, status: 'Completed' }
    : isDesigner
      ? { designerId: id, customerId, status: 'Completed' }
      : { id: -1 };

  const orders = await prisma.order.findMany({ where });
  const paidField = isSales ? 'commissionPaid' : 'productionPaid';
  const allPaid = orders.length > 0 && orders.every((o) => o[paidField]);

  if (orders.length) {
    await prisma.order.updateMany({ where: { id: { in: orders.map((o) => o.id) } }, data: { [paidField]: !allPaid } });
  }
  res.json({ ok: true });
}));

module.exports = router;
