import { z } from 'zod';

// Shared password validation: 8+ chars, 1 uppercase, 1 special character
const passwordSchema = z
  .string()
  .min(8, 'validation.passwordMinLength')
  .regex(/[A-Z]/, 'validation.passwordUppercase')
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    'validation.passwordSpecialChar',
  );

/**
 * Password strength states for UI feedback (3 states: weak / fair / strong)
 */
type PasswordStrength = 'weak' | 'fair' | 'strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-100
  /** Translation key relative to auth namespace (e.g. 'passwordStrength.weak') */
  label: string;
  color: string;
}

/**
 * Calculate password strength for real-time UI feedback.
 * This is a client-side helper — the server has its own validation.
 * Returns translation keys — resolve via t(result.label) with useTranslations('auth').
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      strength: 'weak',
      score: 0,
      label: 'passwordStrength.weak',
      color: '#ef4444',
    };
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
    return {
      strength: 'strong',
      score,
      label: 'passwordStrength.strong',
      color: '#10b981',
    };
  if (score >= 45)
    return {
      strength: 'fair',
      score,
      label: 'passwordStrength.fair',
      color: '#f59e0b',
    };
  return {
    strength: 'weak',
    score,
    label: 'passwordStrength.weak',
    color: '#ef4444',
  };
}

/**
 * Zod messages are translation keys relative to the `auth` namespace.
 * Resolve them via t(err.message) where t = useTranslations('auth').
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'validation.emailOrUsernameRequired'),
  password: z.string().min(1, 'validation.passwordRequired'),
  captchaToken: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, 'validation.nameMinLength'),
  username: z
    .string()
    .min(3, 'validation.usernameMinLength')
    .regex(/^[a-z0-9_]+$/i, 'validation.usernameFormat'),
  email: z.string().email('validation.invalidEmail'),
  password: passwordSchema,
  inviteCode: z.string().optional().or(z.literal('')),
  captchaToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .email('validation.invalidEmail')
      .optional()
      .or(z.literal('')),
    username: z
      .string()
      .min(3, 'validation.usernameMinLength')
      .optional()
      .or(z.literal('')),
    captchaToken: z.string().optional(),
  })
  .refine((data) => !!data.email || !!data.username, {
    message: 'validation.emailOrUsernameNeeded',
    path: ['email'],
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordsMismatch',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
