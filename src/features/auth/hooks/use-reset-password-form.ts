'use client';

import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { z } from 'zod';
import { resetPassword } from '@/features/auth/api';
import {
  type ResetPasswordInput,
  resetPasswordSchema,
} from '@/features/auth/schema';
import type { ApiError } from '@/types';

export function useResetPasswordForm(token: string) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ResetPasswordInput>({
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: ResetPasswordInput) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = resetPasswordSchema.safeParse(formData);
    if (!result.success) {
      const errors: typeof fieldErrors = {};
      result.error.issues.forEach((err: z.ZodIssue) => {
        const field = err.path[0] as keyof typeof fieldErrors;
        if (field) {
          errors[field] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, formData.password);
      setSuccess(true);
      toast.success('Password reset successfully!');

      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      if (apiError.code === 'VALIDATION_ERROR' && apiError.details) {
        const errors: typeof fieldErrors = {};
        apiError.details.forEach((detail) => {
          const field = detail.path as keyof typeof fieldErrors;
          if (field) {
            errors[field] = detail.message;
          }
        });
        setFieldErrors(errors);
      } else {
        const msg =
          apiError.message || 'Failed to reset password. Please try again.';
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    success,
    formData,
    fieldErrors,
    handleChange,
    handleSubmit,
  };
}
