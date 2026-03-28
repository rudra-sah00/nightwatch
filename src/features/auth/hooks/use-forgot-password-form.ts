'use client';

import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { z } from 'zod';
import { forgotPassword } from '@/features/auth/api';
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from '@/features/auth/schema';
import type { ApiError } from '@/types';

export function useForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [formData, setFormData] = useState<ForgotPasswordInput>({
    email: '',
  });

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
  }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: ForgotPasswordInput) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!captchaToken) {
      setError('Please complete the security verification.');
      return;
    }

    const result = forgotPasswordSchema.safeParse({
      ...formData,
      captchaToken,
    });
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
      await forgotPassword({ ...formData, captchaToken });
      setSuccess(true);
      toast.success('Reset link sent!');
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
          apiError.message || 'Failed to send reset link. Please try again.';
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
    captchaToken,
    setCaptchaToken,
    formData,
    fieldErrors,
    handleChange,
    handleSubmit,
  };
}
