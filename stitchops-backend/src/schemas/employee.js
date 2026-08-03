const { z } = require('zod');

const createEmployeeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  role: z.string().min(1),
  designation: z.string().trim().optional().default(''),
  email: z.string().trim().optional().default(''),
  currency: z.string().min(1),
  baseSalary: z.number().nonnegative(),
  payoutDay: z.number().int().min(1).max(28),
  emails: z.array(z.string()).optional().default([])
});

const updateEmployeeSchema = createEmployeeSchema.partial();

module.exports = { createEmployeeSchema, updateEmployeeSchema };
