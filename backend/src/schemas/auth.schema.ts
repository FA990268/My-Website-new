import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email('Please provide a valid administrative email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').optional(),
});

export const adminCreateSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Full name is required'),
  role: z.enum(['SUPER_ADMIN', 'EXAM_MANAGER', 'AUDITOR']).default('EXAM_MANAGER'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(10)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
});
