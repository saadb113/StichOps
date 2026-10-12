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
  // Optional — an admin can leave a customer company-owned with no
  // individual salesperson. A salesperson creating their own customer is
  // always forced to themselves server-side regardless of what's sent here.
  salesperson: z.string().trim().nullable().optional(),
  receivedEmail: z.string().nullable().optional(),
  invoiceDay: z.number().int().min(1).max(31).nullable().optional(),
  notes: z.string().trim().default(''),
  status: z.enum(['Free Trial', 'Paid']).optional(),
  preferredBankAccountId: z.number().int().nullable().optional()
});

const updateCustomerSchema = createCustomerSchema.partial();

module.exports = { createCustomerSchema, updateCustomerSchema };
