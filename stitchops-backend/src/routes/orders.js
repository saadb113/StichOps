const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { serializeOrder, serializeCustomer } = require('../lib/serialize');
const { orderInclude, customerInclude } = require('../lib/includes');
const { createOrderSchema, updateOrderSchema, commentSchema } = require('../schemas/order');
const { parseDateOnly, today } = require('../lib/date');

const router = express.Router();

async function resolveDesigner(name) {
  const employee = await prisma.employee.findFirst({ where: { name, role: 'Designer' } });
  if (!employee) {
    const err = new Error(`No designer named "${name}" was found.`);
    err.status = 400;
    throw err;
  }
  return employee;
}

async function loadOrderOr404(id, res) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) { res.status(404).json({ error: 'Order not found.' }); return null; }
  return order;
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const where = req.user.role === 'SALESPERSON' ? { customer: { salespersonId: req.user.employeeId } } : {};
  const orders = await prisma.order.findMany({ where, include: orderInclude, orderBy: { date: 'desc' } });
  res.json(orders.map(serializeOrder));
}));

router.post('/', requireAuth, requireAdmin, validateBody(createOrderSchema), asyncHandler(async (req, res) => {
  const body = req.body;
  const designer = await resolveDesigner(body.designer);
  const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        customerId: body.customerId,
        name: body.name,
        date: parseDateOnly(body.date),
        price: body.price,
        currency: body.currency,
        designerId: designer.id,
        productionCost: body.productionCost,
        commissionRate: body.commissionRate,
        status: body.status
      },
      include: orderInclude
    });

    let statusChangedTo = null;
    let updatedCustomer = customer;
    if (customer.status !== 'Paid') {
      updatedCustomer = await tx.customer.update({ where: { id: customer.id }, data: { status: 'Paid' }, include: customerInclude });
      statusChangedTo = 'Paid';
    } else {
      updatedCustomer = await tx.customer.findUnique({ where: { id: customer.id }, include: customerInclude });
    }
    return { order, updatedCustomer, statusChangedTo };
  });

  res.status(201).json({
    order: serializeOrder(result.order),
    customer: serializeCustomer(result.updatedCustomer),
    statusChangedTo: result.statusChangedTo
  });
}));

router.patch('/:id', requireAuth, requireAdmin, validateBody(updateOrderSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await loadOrderOr404(id, res);
  if (!existing) return;

  const body = req.body;
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.date !== undefined) data.date = parseDateOnly(body.date);
  if (body.price !== undefined) data.price = body.price;
  if (body.currency !== undefined) data.currency = body.currency;
  if (body.productionCost !== undefined) data.productionCost = body.productionCost;
  if (body.commissionRate !== undefined) data.commissionRate = body.commissionRate;
  if (body.status !== undefined) data.status = body.status;
  if (body.designer !== undefined) {
    const designer = await resolveDesigner(body.designer);
    data.designerId = designer.id;
  }

  const updated = await prisma.order.update({ where: { id }, data, include: orderInclude });
  res.json({ order: serializeOrder(updated), wasInvoiced: existing.invoiceId != null });
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Order not found.' });
  await prisma.order.delete({ where: { id } });
  res.json({ ok: true });
}));

router.post('/:id/comments', requireAuth, validateBody(commentSchema), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true } });
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (req.user.role === 'SALESPERSON' && order.customer.salespersonId !== req.user.employeeId) {
    return res.status(403).json({ error: 'Not your order.' });
  }

  await prisma.orderComment.create({
    data: { orderId: id, author: 'You', date: parseDateOnly(today()), text: req.body.text }
  });
  const updated = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  res.status(201).json(serializeOrder(updated));
}));

module.exports = router;
