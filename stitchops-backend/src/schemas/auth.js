const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false)
});

const changePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters.')
});

const forgotPasswordSchema = z.object({
  email: z.string().min(1)
});

module.exports = { loginSchema, changePasswordSchema, forgotPasswordSchema };
