const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Tab name is required.')
});

const companyEmailSchema = z.object({
  email: z.string().trim().min(3, 'Enter an email first.')
});

module.exports = { categorySchema, companyEmailSchema };
