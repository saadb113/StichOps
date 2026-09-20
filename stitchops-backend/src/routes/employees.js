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
const { isForeignKeyViolation } = require('../lib/prismaErrors');
const { upload, deleteUploadedFile } = require('../lib/upload');
const { convertToDefaultCurrency, getDefaultCurrency } = require('../lib/currency');
const { nextSlipNumberForEmployee, generateSlipPrefix } = require('../lib/slipNumber');
const { previousMonthPeriod } = require('../lib/period');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const employees = await prisma.employee.findMany({ include: employeeInclude, orderBy: { id: 'asc' } });
  res.json(employees.map(serializeEmployee));
}));

router.post('/', requireAuth, requireAdmin, validateBody(createEmployeeSchema), asyncHandler(async (req, res) => {
  const body = req.body;
  // Base salary is always reported in the company's default currency —
  // employees don't get an independent currency choice.
  const defaultCurrency = await getDefaultCurrency(prisma);

  const result = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        name: body.name,
        role: body.role,
        designation: body.designation || null,
        email: body.email || null,
        contact: body.contact || null,
        currency: defaultCurrency,
        baseSalary: body.baseSalary,
        payoutDay: body.payoutDay,
        commissionRate: body.commissionRate,
        slipPrefix: generateSlipPrefix(body.name)
      }
    });

    if (body.emails && body.emails.length) {
      await tx.companyEmail.updateMany({
        where: { email: { in: body.emails }, employeeId: null },
        data: { employeeId: employee.id }
      });
    }

    // Every employee gets a self-service login now, not just Salespeople —
    // Designers and custom-team employees get the same portal (their own
    // payslip/info, no customer-facing bits). Only the User.role differs.
    let credentials = null;
    let needsEmailWarning = false;
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
      const userRole = employee.role === 'Salesperson' ? 'SALESPERSON' : 'EMPLOYEE';
      const user = await tx.user.create({
        data: { email: body.email.toLowerCase(), passwordHash, role: userRole, employeeId: employee.id, mustChangePassword: true, welcomed: false }
      });
      credentials = { name: employee.name, email: user.email, tempPw };
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
  if (body.contact !== undefined) data.contact = body.contact || null;
  // currency is never client-settable — it always tracks the company default.
  if (body.baseSalary !== undefined) data.baseSalary = body.baseSalary;
  if (body.payoutDay !== undefined) data.payoutDay = body.payoutDay;
  if (body.commissionRate !== undefined) data.commissionRate = body.commissionRate;

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
    if (isForeignKeyViolation(e)) {
      return res.status(409).json({ error: `Can't delete ${existing.name} — they still have assigned customers, orders, payslips, or password reset requests. Reassign or remove those first.` });
    }
    throw e;
  }
  res.json({ ok: true });
}));

// For employees created before self-service logins existed for their role
// (or who were added without an email at the time) — provisions a login
// the same way the create-employee flow does.
router.post('/:id/create-login', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return res.status(404).json({ error: 'Employee not found.' });

  const existing = await prisma.user.findUnique({ where: { employeeId: id } });
  if (existing) return res.status(400).json({ error: 'This employee already has a login.' });

  const email = (req.body.email || employee.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'An email is required to create a login.' });

  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash) return res.status(409).json({ error: 'A login with that email already exists.' });

  const tempPw = genTempPassword();
  const passwordHash = await hashPassword(tempPw);
  const userRole = employee.role === 'Salesperson' ? 'SALESPERSON' : 'EMPLOYEE';

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: { email, passwordHash, role: userRole, employeeId: id, mustChangePassword: true, welcomed: false }
    });
    if (!employee.email) await tx.employee.update({ where: { id }, data: { email } });
  });

  res.json({ name: employee.name, email, tempPw });
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

  // A slip only becomes approvable once its month has actually closed — the
  // still-open current month stays edit-only in the UI, and this check
  // backs that up server-side (and stops the same closed month being
  // approved twice, since base salary has no "already paid" flag to check
  // the way orders do).
  const { periodStart, periodEnd } = previousMonthPeriod();
  if (employee.lastSlipApprovedPeriod && employee.lastSlipApprovedPeriod.getTime() >= periodStart.getTime()) {
    return res.status(400).json({ error: 'This month\'s slip has already been approved.' });
  }

  const isSales = employee.role === 'Salesperson';
  const isDesigner = employee.role === 'Designer';

  const eligible = isSales
    ? await prisma.order.findMany({ where: { customer: { salespersonId: id }, status: 'Completed', commissionPaid: false, date: { lte: periodEnd } } })
    : isDesigner
      ? await prisma.order.findMany({ where: { designerId: id, status: 'Completed', productionPaid: false, date: { lte: periodEnd } } })
      : [];

  const defaultCurrency = await getDefaultCurrency(prisma);
  // Commission is a % of the order price, which is in the customer's own
  // currency (GBP/USD/EUR/AUD) — convert each order's share into the
  // default currency before summing so mixed-currency orders add up
  // correctly. Production cost is already entered in the default currency.
  let variableTotal = 0;
  for (const o of eligible) {
    if (isSales) variableTotal += await convertToDefaultCurrency(prisma, commissionAmt(o), o.currency, defaultCurrency);
    else variableTotal += o.productionCost;
  }
  const bonuses = Array.isArray(req.body.bonuses)
    ? req.body.bonuses
        .map((b) => ({ label: (typeof b.label === 'string' ? b.label.trim() : '') || 'Bonus', amount: Number(b.amount) || 0 }))
        .filter((b) => b.amount > 0)
    : [];
  const bonusTotal = bonuses.reduce((s, b) => s + b.amount, 0);
  const total = employee.baseSalary + variableTotal + bonusTotal;
  const todayDate = parseDateOnly(today());

  const payslip = await prisma.$transaction(async (tx) => {
    const slipNo = await nextSlipNumberForEmployee(tx, employee);
    const created = await tx.payslip.create({
      data: {
        employeeId: id,
        slipNo,
        total,
        currency: defaultCurrency,
        baseSalary: employee.baseSalary,
        commission: variableTotal,
        bonusTotal,
        approvedDate: todayDate
      }
    });

    if (bonuses.length) {
      await tx.payslipBonus.createMany({
        data: bonuses.map((b) => ({ payslipId: created.id, label: b.label, amount: b.amount }))
      });
    }

    if (eligible.length) {
      await tx.order.updateMany({
        where: { id: { in: eligible.map((o) => o.id) } },
        data: isSales
          ? { commissionPaid: true, commissionPayslipId: created.id }
          : { productionPaid: true, productionPayslipId: created.id }
      });
    }

    await tx.employee.update({ where: { id }, data: { lastSlipApprovedPeriod: periodStart } });

    return tx.payslip.findUnique({ where: { id: created.id }, include: { commissionOrders: true, productionOrders: true, bonuses: true } });
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

router.post('/:id/photo', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const isSelf = req.user.employeeId === id;
  if (req.user.role !== 'ADMIN' && !isSelf) {
    if (req.file) deleteUploadedFile(`/uploads/${req.file.filename}`);
    return res.status(403).json({ error: 'You can only update your own photo.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No image was uploaded.' });

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Employee not found.' });

  const photo = `/uploads/${req.file.filename}`;
  await prisma.employee.update({ where: { id }, data: { photo } });
  if (existing.photo) deleteUploadedFile(existing.photo);

  const updated = await prisma.employee.findUnique({ where: { id }, include: employeeInclude });
  res.json(serializeEmployee(updated));
}));

router.delete('/:id/photo', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const isSelf = req.user.employeeId === id;
  if (req.user.role !== 'ADMIN' && !isSelf) {
    return res.status(403).json({ error: 'You can only remove your own photo.' });
  }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Employee not found.' });

  await prisma.employee.update({ where: { id }, data: { photo: null } });
  if (existing.photo) deleteUploadedFile(existing.photo);

  const updated = await prisma.employee.findUnique({ where: { id }, include: employeeInclude });
  res.json(serializeEmployee(updated));
}));

module.exports = router;
