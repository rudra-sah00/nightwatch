import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { CaptchaHandle } from '@/components/ui/captcha';
import { type RegisterInput, registerSchema } from '@/features/auth/schema';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';

type Step = 'initial' | 'otp';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export function useSignupForm() {
  const { register, verifyOtp, resendOtp } = useAuth();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  const [formData, setFormData] = useState<RegisterInput>({
    name: '',
    email: '',
    password: '',
    inviteCode: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string | undefined>
  >({});

  // Pre-fill invite code from URL
  useEffect(() => {
    const invite = searchParams.get('invite');
    if (invite) {
      setFormData((prev) => ({ ...prev, inviteCode: invite }));
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError(null);
  };

  const [state, action, isPending] = React.useActionState(
    async (_prevState: FormState | null, formData: FormData) => {
      setError(null);
      setFieldErrors({});

      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const inviteCode = formData.get('inviteCode') as string;
      const confirmPassword = formData.get('confirmPassword') as string;
      const captchaToken = formData.get('captchaToken') as string;

      if (!captchaToken) {
        return { error: 'Please complete the security verification.' };
      }

      if (password !== confirmPassword) {
        return {
          fieldErrors: { confirmPassword: 'Passwords do not match' },
          error: 'Please make sure both passwords match.',
        };
      }

      const result = registerSchema.safeParse({
        name,
        email,
        password,
        inviteCode,
        captchaToken,
      });
      if (!result.success) {
        const errors: Record<string, string> = {};
        for (const err of result.error.issues) {
          const field = err.path[0];
          if (typeof field === 'string') errors[field] = err.message;
        }
        return { fieldErrors: errors };
      }

      try {
        const response = await register({
          name,
          email,
          password,
          inviteCode,
          captchaToken,
        });
        if (response.requiresOtp) {
          setStep('otp');
          return { success: true };
        }
        return { success: true };
      } catch (err: unknown) {
        // Handle specific validation errors from the backend (e.g. email already taken)
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
          // Reset captcha because the backend consumed the token on THIS request
          setCaptchaToken(null);
          captchaRef.current?.reset();
          return { fieldErrors: errors };
        }

        // For all other backend errors, we must also reset the captcha widget
        // Turnstile tokens are single-use; if the backend consumed the token before
        // another error occurred (e.g. invite code invalid), the next submission
        // would fail with "Security verification failed" without this reset.
        setCaptchaToken(null);
        captchaRef.current?.reset();
        return {
          error:
            err instanceof Error
              ? err.message
              : 'Registration failed. Please try again.',
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
      await verifyOtp(formData.email, otp, 'register');
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
    captchaRef,
    formData,
    confirmPassword,
    setConfirmPassword,
    otp,
    setOtp,
    fieldErrors,
    setFieldErrors,
    setError,
    countdown,
    isPending,
    action,
    handleChange,
    handleResend,
    handleOtpSubmit,
    isOtpStep: step === 'otp',
  };
}
