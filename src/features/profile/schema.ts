import { z } from 'zod';

/**
 * Zod messages are translation keys relative to the `profile` namespace.
 * Resolve them via t(err.message) where t = useTranslations('profile').
 */

// Mirrors the backend UpdateProfileSchema in user.controller.ts
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'validation.nameMinLength').optional(),
  username: z
    .string()
    .min(3, 'validation.usernameMinLength')
    .regex(/^\w+$/, 'validation.usernameFormat')
    .optional(),
  preferredServer: z.enum(['s1', 's2', 's3']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'validation.currentPasswordRequired'),
    newPassword: z
      .string()
      .min(8, 'validation.passwordMinLength')
      .regex(/[A-Z]/, 'validation.passwordUppercase')
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
        'validation.passwordSpecialChar',
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'validation.newPasswordsMismatch',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
