import { z } from 'zod';

// Shared password validation: 8+ chars, 1 uppercase, 1 special character
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    'Password must contain at least one special character',
  );

/**
 * Password strength states for UI feedback (3 states: weak / fair / strong)
 */
type PasswordStrength = 'weak' | 'fair' | 'strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-100
  label: string;
  color: string;
}

/**
 * Calculate password strength for real-time UI feedback.
 * This is a client-side helper — the server has its own validation.
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { strength: 'weak', score: 0, label: 'Weak', color: '#ef4444' };
  }

  let score = 0;

  // Length scoring
  if (password.length >= 16) score += 30;
  else if (password.length >= 12) score += 25;
  else if (password.length >= 8) score += 20;
  else score += 5;

  // Character variety
  if (/[A-Z]/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;

  // All 4 types bonus
  if (
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  ) {
    score += 15;
  }

  // Penalties
  if (/(.)\1{2,}/.test(password)) score -= 10; // repeated chars
  if (/qwerty|asdfgh/i.test(password)) score -= 10; // keyboard patterns

  score = Math.max(0, Math.min(100, score));

  if (score >= 70)
    return { strength: 'strong', score, label: 'Strong', color: '#10b981' };
  if (score >= 45)
    return { strength: 'fair', score, label: 'Fair', color: '#f59e0b' };
  return { strength: 'weak', score, label: 'Weak', color: '#ef4444' };
}

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(
      /^[a-z0-9_]+$/i,
      'Username can only contain letters, numbers, and underscores',
    ),
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  inviteCode: z.string().optional(),
  captchaToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email format')
      .optional()
      .or(z.literal('')),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .optional()
      .or(z.literal('')),
    captchaToken: z.string().optional(),
  })
  .refine((data) => !!data.email || !!data.username, {
    message: 'Either email or username is required',
    path: ['email'],
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
