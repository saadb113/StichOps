const { z } = require('zod');

const createEmployeeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  role: z.string().min(1),
  designation: z.string().trim().optional().default(''),
  email: z.string().trim().optional().default(''),
  contact: z.string().trim().optional().default(''),
  currency: z.string().min(1),
  baseSalary: z.number().nonnegative(),
  payoutDay: z.number().int().min(1).max(28),
  commissionRate: z.number().min(0).max(100).optional().default(10),
  emails: z.array(z.string()).optional().default([])
});

// .partial() alone would still apply createEmployeeSchema's .default(...)
// values (commissionRate, designation, email, contact) to any field missing
// from a PATCH body, silently overwriting them — re-declare commissionRate
// here without a default so a partial update (e.g. editing assigned emails
// only) can't reset it back to 10.
const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  commissionRate: z.number().min(0).max(100).optional()
});

module.exports = { createEmployeeSchema, updateEmployeeSchema };
