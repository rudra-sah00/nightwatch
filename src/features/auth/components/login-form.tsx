import { AlertCircle, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import { type LoginInput, loginSchema } from '@/features/auth/schema';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';

type Step = 'initial' | 'otp';

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export function LoginForm() {
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
      // AuthProvider handles redirect via auth state change
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const msg = apiError.message || 'Verification failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isOtpStep = step === 'otp';

  return (
    <div className="w-full">
      {error ? <FormError message={error} /> : null}

      {isOtpStep ? (
        <OtpStep
          email={formData.email}
          otp={otp}
          setOtp={setOtp}
          onSubmit={handleOtpSubmit}
          onResend={handleResend}
          onBack={() => setStep('initial')}
          isLoading={isLoading}
          countdown={countdown}
        />
      ) : (
        <InitialLoginStep
          formData={formData}
          fieldErrors={fieldErrors}
          isLoading={isPending}
          captchaToken={captchaToken}
          setCaptchaToken={setCaptchaToken}
          handleChange={handleChange}
          action={action}
        />
      )}
    </div>
  );
}

// --- Memoized Helper Components ---

const FormError = React.memo(function FormError({
  message,
}: {
  message: string;
}) {
  const isSecurity =
    message.toLowerCase().includes('locked') ||
    message.toLowerCase().includes('denied') ||
    message.toLowerCase().includes('warning') ||
    message.toLowerCase().includes('security');

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg p-3 text-sm border mb-4 animate-in fade-in duration-200',
        isSecurity
          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
          : 'bg-destructive/15 text-destructive border-destructive/20',
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <p className="font-medium">{message}</p>
    </div>
  );
});

interface OtpStepProps {
  email: string;
  otp: string;
  setOtp: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
  countdown: number;
}

const OtpStep = React.memo(function OtpStep({
  email,
  otp,
  setOtp,
  onSubmit,
  onResend,
  onBack,
  isLoading,
  countdown,
}: OtpStepProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300"
    >
      <div className="text-center space-y-2">
        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold">Verification Code</h2>
        <p className="text-sm text-muted-foreground">
          We sent a code to{' '}
          <span className="font-medium text-foreground">{email}</span>. Please
          check your spam folder.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="sr-only">One-Time Password</Label>
        <OtpInput value={otp} onChange={(e) => setOtp(e.target.value)} />
      </div>

      <Button
        type="submit"
        size="lg"
        isLoading={isLoading}
        disabled={isLoading || otp.length !== 6}
        className="w-full text-base font-semibold"
      >
        Verify & Sign In
      </Button>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={onResend}
          disabled={isLoading || countdown > 0}
        >
          {countdown > 0 ? (
            <>Resend Code in {countdown}s</>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Resend Verification Code
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onBack}
          disabled={isLoading}
        >
          Back to Login
        </Button>
      </div>
    </form>
  );
});

interface InitialStepProps {
  formData: LoginInput;
  fieldErrors: Record<string, string | undefined>;
  isLoading: boolean;
  captchaToken: string | null;
  setCaptchaToken: (val: string | null) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  action: (formData: FormData) => void;
}

const InitialLoginStep = React.memo(function InitialLoginStep({
  formData,
  fieldErrors,
  isLoading,
  captchaToken,
  setCaptchaToken,
  handleChange,
  action,
}: InitialStepProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email or Username</Label>
        <Input
          id="email"
          name="email"
          placeholder="Email or username"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          autoComplete="username"
          disabled={isLoading}
          className="bg-secondary/50"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
            tabIndex={-1}
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          error={fieldErrors.password}
          autoComplete="current-password"
          disabled={isLoading}
          className="bg-secondary/50"
        />
      </div>

      <input type="hidden" name="captchaToken" value={captchaToken || ''} />
      <Captcha
        onVerify={setCaptchaToken}
        onError={() => setCaptchaToken(null)}
      />

      <Button
        type="submit"
        size="lg"
        isLoading={isLoading}
        disabled={!captchaToken || isLoading}
        className="w-full text-base font-semibold mt-2"
      >
        Sign In
      </Button>
    </form>
  );
});
