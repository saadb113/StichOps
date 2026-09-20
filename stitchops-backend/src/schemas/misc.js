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
  country: z.string().trim().min(1, 'Country is required.'),
  currency: z.string().trim().min(1, 'Currency is required.'),
  accountName: z.string().trim().optional().default(''),
  accountHolder: z.string().trim().optional().default(''),
  accountNo: z.string().trim().optional().default(''),
  sortCode: z.string().trim().optional().default(''),
  routingNumber: z.string().trim().optional().default(''),
  accountType: z.string().trim().optional().default(''),
  bic: z.string().trim().optional().default(''),
  iban: z.string().trim().optional().default(''),
  bsb: z.string().trim().optional().default(''),
  paymentAccount: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default('')
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
