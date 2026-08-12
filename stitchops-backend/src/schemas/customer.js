const { z } = require('zod');

const createCustomerSchema = z.object({
  customerCode: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1, 'Contact name is required.'),
  company: z.string().trim().min(1, 'Company name is required.'),
  country: z.string().min(1),
  currency: z.string().min(1),
  address: z.string().trim().default(''),
  zip: z.string().trim().default(''),
  email: z.string().trim().default(''),
  emailClient: z.string().min(1),
  contact: z.string().trim().default(''),
  salesperson: z.string().min(1, 'Salesperson is required.'),
  receivedEmail: z.string().nullable().optional(),
  invoiceDay: z.number().int().min(1).max(28).nullable().optional(),
  notes: z.string().trim().default(''),
  status: z.enum(['Free Trial', 'Paid']).optional()
});

const updateCustomerSchema = createCustomerSchema.partial();

module.exports = { createCustomerSchema, updateCustomerSchema };
