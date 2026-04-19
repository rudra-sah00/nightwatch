import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { CaptchaHandle } from '@/components/ui/captcha';
import { checkUsername, validateInvite } from '@/features/auth/api';
import { type RegisterInput, registerSchema } from '@/features/auth/schema';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';

type Step = 'name' | 'details' | 'otp';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export function useSignupForm() {
  const { register, verifyOtp, resendOtp } = useAuth();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('name');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  const [isInviteValid, setIsInviteValid] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<RegisterInput>({
    name: '',
    username: '',
    email: '',
    password: '',
    inviteCode: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string | undefined>
  >({});

  // Real-time username availability check (Debounced)
  useEffect(() => {
    const username = formData.username.trim().toLowerCase();
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    if (!/^[a-z0-9_]+$/i.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { available } = await checkUsername(username);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch (err) {
        console.error('[SignupForm] Username check failed:', err);
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.username]);

  // Pre-fill invite code from URL and validate
  useEffect(() => {
    const invite = searchParams.get('invite');
    if (!invite) {
      setIsInviteValid(false);
      return;
    }

    setFormData((prev) => ({ ...prev, inviteCode: invite }));

    const checkInvite = async () => {
      try {
        const { valid } = await validateInvite(invite);
        setIsInviteValid(valid);
      } catch (err) {
        console.error('[SignupForm] Invite validation failed:', err);
        setIsInviteValid(false);
      }
    };

    checkInvite();
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError(null);
  };

  const handleSetStep = (newStep: Step) => {
    setError(null);
    setFieldErrors({});
    setStep(newStep);
  };

  const [state, action, isPending] = React.useActionState(
    async (_prevState: FormState | null, formData: FormData) => {
      setError(null);
      setFieldErrors({});

      const name = formData.get('name') as string;
      const username = formData.get('username') as string;
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
        username,
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
        const firstIssue = result.error.issues[0]?.message;
        return {
          fieldErrors: errors,
          error:
            firstIssue ||
            'Some details look invalid. Please review the form and try again.',
        };
      }

      try {
        const response = await register({
          name,
          username,
          email,
          password,
          inviteCode,
          captchaToken,
        });

        if (response.requiresOtp) {
          handleSetStep('otp');
          return { success: true };
        }
        return { success: true };
      } catch (err: unknown) {
        console.error('[SignupForm] Registration failed:', err);
        const apiError = err as ApiError;

        // Handle specific validation errors from the backend (e.g. email already taken)
        if (
          apiError?.code === 'VALIDATION_ERROR' &&
          Array.isArray(apiError.details)
        ) {
          const errors: Record<string, string> = {};
          let fallbackMessage: string | undefined;

          for (const detail of apiError.details) {
            if (!detail || typeof detail !== 'object') continue;

            const rawDetail = detail as Record<string, unknown>;
            const field =
              typeof rawDetail.path === 'string' ? rawDetail.path : undefined;
            const message =
              typeof rawDetail.message === 'string'
                ? rawDetail.message
                : undefined;

            if (field && message) {
              errors[field] = message;
            }

            if (!fallbackMessage && message) {
              fallbackMessage = message;
            }
          }

          // Reset captcha because the backend consumed the token on THIS request
          setCaptchaToken(null);
          captchaRef.current?.reset();

          if (Object.keys(errors).length > 0) {
            return {
              fieldErrors: errors,
              ...(fallbackMessage ? { error: fallbackMessage } : {}),
            };
          }

          return {
            error:
              fallbackMessage ||
              'Some details are invalid. Please review your information and try again.',
          };
        }

        if (apiError?.code === 'USER_EXISTS') {
          setCaptchaToken(null);
          captchaRef.current?.reset();
          return {
            fieldErrors: {
              email: 'An account with this email already exists',
            },
            error: 'An account with this email already exists.',
          };
        }

        if (apiError?.code === 'INVALID_INVITE') {
          setCaptchaToken(null);
          captchaRef.current?.reset();
          return {
            error:
              'Invite link is invalid or expired. Please request a new invite link.',
          };
        }

        if (
          apiError?.code === 'CAPTCHA_REQUIRED' ||
          apiError?.code === 'CAPTCHA_FAILED'
        ) {
          setCaptchaToken(null);
          captchaRef.current?.reset();
          return {
            error:
              'Security verification failed. Please complete the captcha again and retry.',
          };
        }

        if (apiError?.code === 'OTP_RATE_LIMIT' || apiError?.status === 429) {
          setCaptchaToken(null);
          captchaRef.current?.reset();
          return {
            error:
              apiError.message ||
              'Too many attempts. Please wait a little and try again.',
          };
        }

        // For all other backend errors, we must also reset the captcha widget
        // Turnstile tokens are single-use; if the backend consumed the token before
        // another error occurred (e.g. invite code invalid), the next submission
        // would fail with "Security verification failed" without this reset.
        setCaptchaToken(null);
        captchaRef.current?.reset();

        const isNetworkLikeError =
          (err instanceof Error &&
            /(failed to fetch|networkerror|timed out)/i.test(err.message)) ||
          (apiError?.status === 408 && !!apiError.message);

        if (isNetworkLikeError) {
          return {
            error:
              'Network issue detected. Please check your connection (or disable VPN/ad-blocker) and try again.',
          };
        }

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
      if ('fieldErrors' in state && state.fieldErrors) {
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
      const msg = 'Please enter a valid 6-digit code.';
      setError(msg);
      toast.error(msg);
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
    setStep: handleSetStep,
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
    usernameStatus,
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
    isInviteValid,
  };
}
