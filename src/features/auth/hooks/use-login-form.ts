import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type LoginInput, loginSchema } from '@/features/auth/schema';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';

type Step = 'initial' | 'otp';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export function useLoginForm() {
  const { login, verifyOtp, resendOtp } = useAuth();
  const [step, setStep] = useState<Step>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });

  const [otp, setOtp] = useState('');

  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string | undefined>
  >({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: LoginInput) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError(null);
  };

  const [state, action, isPending] = React.useActionState(
    async (_prevState: FormState | null, formData: FormData) => {
      setError(null);
      setFieldErrors({});

      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const captchaToken = formData.get('captchaToken') as string;

      if (!captchaToken) {
        return { error: 'Please complete the security verification.' };
      }

      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        const errors: Record<string, string> = {};
        for (const err of result.error.issues) {
          const field = err.path[0];
          if (typeof field === 'string') errors[field] = err.message;
        }
        return { fieldErrors: errors };
      }

      try {
        const response = await login({ email, password, captchaToken });
        if (response.requiresOtp) {
          if (response.email) {
            setFormData((prev) => ({ ...prev, email: response.email ?? '' }));
          }
          setStep('otp');
          return { success: true };
        }
        return { success: true };
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          err.code === 'VALIDATION_ERROR' &&
          'details' in err &&
          Array.isArray(err.details)
        ) {
          const errors: Record<string, string> = {};
          for (const detail of err.details) {
            const field = detail.path;
            if (typeof field === 'string') errors[field] = detail.message;
          }
          return { fieldErrors: errors };
        }
        return {
          error:
            err instanceof Error
              ? err.message
              : 'Login failed. Please try again.',
        };
      }
    },
    null,
  );

  useEffect(() => {
    if (state) {
      if (state.error) {
        setError(state.error);
        toast.error(state.error);
      }
      if (state.fieldErrors) {
        setFieldErrors(state.fieldErrors);
      }
    }
  }, [state]);

  const [countdown, setCountdown] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (step === 'otp') {
      setCountdown(30);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      await resendOtp(formData.email);
      setCountdown(60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      toast.success('Verification code resent');
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const msg = apiError.message || 'Resend failed. Please wait.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp(formData.email, otp, 'login');
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const msg = apiError.message || 'Verification failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    step,
    setStep,
    isLoading,
    error,
    captchaToken,
    setCaptchaToken,
    formData,
    otp,
    setOtp,
    fieldErrors,
    countdown,
    isPending,
    action,
    handleChange,
    handleResend,
    handleOtpSubmit,
    isOtpStep: step === 'otp',
  };
}
