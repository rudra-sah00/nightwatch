import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { forgotPassword } from '@/features/auth/api';
import { loginSchema } from '@/features/auth/schema';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';

type Step = 'initial' | 'otp' | 'forgot' | 'forgot_success';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

const MOBILE_LOGIN_STATE_KEY = 'mobile_login_state';

export function useLoginForm() {
  const t = useTranslations('toasts');
  const tErr = useTranslations('auth.errors');
  const tAuth = useTranslations('auth');
  const { login, verifyOtp, resendOtp } = useAuth();
  const [step, setStep] = useState<Step>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    identifier: '', // Unified field for forgot password
  });

  const [otp, setOtp] = useState('');

  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string | undefined>
  >({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const mobileMode = searchParams.get('mobile') === '1';
    const mobileState = searchParams.get('state');

    if (mobileMode && mobileState) {
      sessionStorage.setItem(MOBILE_LOGIN_STATE_KEY, mobileState);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError(null);
  };

  const [state, action, isPending] = React.useActionState(
    async (_prevState: FormState | null, formDataObj: FormData) => {
      setError(null);
      setFieldErrors({});

      if (step === 'forgot') {
        return handleForgotPasswordAction(formDataObj);
      }

      const email = formDataObj.get('email') as string;
      const password = formDataObj.get('password') as string;
      const captchaTokenVal = formDataObj.get('captchaToken') as string;

      if (!captchaTokenVal) {
        return { error: tErr('captchaRequired') };
      }

      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        const errors: Record<string, string> = {};
        for (const err of result.error.issues) {
          const field = err.path[0];
          if (typeof field === 'string') errors[field] = tAuth(err.message);
        }
        return { fieldErrors: errors };
      }

      try {
        const response = await login({
          email,
          password,
          captchaToken: captchaTokenVal,
        });
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
          error: err instanceof Error ? err.message : tErr('loginFailed'),
        };
      }
    },
    null,
  );

  const handleForgotPasswordAction = async (formDataObj: FormData) => {
    const identifier = formDataObj.get('identifier') as string;
    const captchaTokenVal = formDataObj.get('captchaToken') as string;

    if (!captchaTokenVal) {
      return { error: tErr('captchaRequired') };
    }

    if (!identifier) {
      return { error: tErr('forgotIdentifierRequired') };
    }

    try {
      await forgotPassword({
        email: identifier,
        captchaToken: captchaTokenVal,
      });
      setStep('forgot_success');
      return { success: true };
    } catch (err: unknown) {
      const apiError = err as ApiError;
      if (apiError.code === 'VALIDATION_ERROR' && apiError.details) {
        const errors: Record<string, string> = {};
        apiError.details.forEach((detail) => {
          // In forgot step, we map validation errors to 'identifier'
          errors.identifier = detail.message;
        });
        return { fieldErrors: errors };
      }
      return {
        error: apiError.message || tErr('forgotFailed'),
      };
    }
  };

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
      toast.success(t('verificationResent'));
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const msg = apiError.message || tErr('resendFailed');
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
      setError(tErr('invalidOtp'));
      return;
    }

    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const mobileMode = searchParams.get('mobile') === '1';
      const mobileState =
        searchParams.get('state') ||
        sessionStorage.getItem(MOBILE_LOGIN_STATE_KEY);

      if (mobileMode && !mobileState) {
        const msg = tErr('mobileSessionExpired');
        setError(msg);
        toast.error(msg);
        return;
      }

      const response = await verifyOtp(
        formData.email,
        otp,
        'login',
        mobileMode && mobileState ? mobileState : undefined,
      );

      if (response.mobileAuthRedirectUrl) {
        sessionStorage.removeItem(MOBILE_LOGIN_STATE_KEY);
        window.location.assign(response.mobileAuthRedirectUrl);
        return;
      }

      if (mobileMode) {
        const msg = tErr('mobileRedirectMissing');
        setError(msg);
        toast.error(msg);
      }
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const msg = apiError.message || tErr('verificationFailed');
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
    isForgotStep: step === 'forgot',
    isForgotSuccessStep: step === 'forgot_success',
  };
}
