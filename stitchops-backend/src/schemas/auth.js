const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false)
});

const changePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  currentPassword: z.string().min(1).optional()
});

const forgotPasswordSchema = z.object({
  email: z.string().min(1)
});

const adminRecoverySchema = z.object({
  email: z.string().min(1),
  code: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters.')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters.')
});

module.exports = { loginSchema, changePasswordSchema, forgotPasswordSchema, adminRecoverySchema, resetPasswordSchema };
