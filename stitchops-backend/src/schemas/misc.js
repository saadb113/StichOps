const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Tab name is required.')
});

const companyEmailSchema = z.object({
  email: z.string().trim().min(3, 'Enter an email first.'),
  employeeId: z.number().int().nullable().optional()
});

const companyEmailUpdateSchema = z.object({
  email: z.string().trim().min(3).optional(),
  employeeId: z.number().int().nullable().optional()
});

const companyUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().optional(),
  email: z.string().trim().optional(),
  contact: z.string().trim().optional(),
  defaultCurrency: z.string().trim().min(1).optional()
});

const bankAccountSchema = z.object({
  currency: z.string().trim().min(1, 'Currency is required.'),
  accountName: z.string().trim().optional().default(''),
  accountNo: z.string().trim().optional().default('')
});

const bankAccountUpdateSchema = bankAccountSchema.partial();

const currencyRateSchema = z.object({
  currency: z.string().trim().min(1, 'Currency is required.'),
  rate: z.number().positive('Rate is required.'),
  isCustom: z.boolean().optional().default(false)
});

const currencyRateUpdateSchema = z.object({
  rate: z.number().positive('Rate is required.').optional(),
  isCustom: z.boolean().optional()
});

module.exports = {
  categorySchema,
  companyEmailSchema,
  companyEmailUpdateSchema,
  companyUpdateSchema,
  bankAccountSchema,
  bankAccountUpdateSchema,
  currencyRateSchema,
  currencyRateUpdateSchema
};
