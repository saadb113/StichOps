const { z } = require('zod');
const { ORDER_STATUSES, dateOnly } = require('./common');

const createOrderSchema = z.object({
  customerId: z.number().int(),
  name: z.string().trim().min(1, 'Order name is required.'),
  date: dateOnly,
  price: z.number().positive('Price is required.'),
  currency: z.string().min(1),
  designer: z.string().min(1, 'Designer is required.'),
  productionCost: z.number().nonnegative().optional().default(0),
  productionCostCurrency: z.string().min(1).optional().default('PKR'),
  commissionRate: z.number().nonnegative().optional().default(10),
  status: z.enum(ORDER_STATUSES).optional().default('Pending')
});

const updateOrderSchema = createOrderSchema.omit({ customerId: true }).partial();

const commentSchema = z.object({
  text: z.string().trim().min(1, 'Comment text is required.')
});

module.exports = { createOrderSchema, updateOrderSchema, commentSchema };
