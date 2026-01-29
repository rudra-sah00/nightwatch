'use client';

import { AlertCircle, Mail } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button, Input, Label } from '@/components/ui';
import { Captcha } from '@/components/ui/captcha';
import { OtpInput } from '@/components/ui/otp-input';
import { type LoginInput, loginSchema } from '@/features/auth';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';

type Step = 'initial' | 'otp';

export function LoginForm() {
  const { login, verifyOtp } = useAuth();
  const [step, setStep] = useState<Step>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });

  const [otp, setOtp] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: LoginInput) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError(null);
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!captchaToken) {
      setError('Please complete the security verification.');
      return;
    }

    const result = loginSchema.safeParse(formData);
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
      const response = await login({ ...formData, captchaToken });

      if (response.requiresOtp) {
        if (response.email) {
          setFormData((prev) => ({ ...prev, email: response.email ?? '' }));
        }
        setStep('otp');
        setError(null);
      }
      // If no OTP required (response.user exists), AuthProvider handles state update
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
        const msg = apiError.message || 'Login failed. Please try again.';
        setError(msg);
        toast.error(msg);
      }
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

  if (step === 'otp') {
    return (
      <form
        onSubmit={handleOtpSubmit}
        className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300"
      >
        <div className="text-center space-y-2">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold">Verification Code</h2>
          <p className="text-sm text-muted-foreground">
            We sent a code to{' '}
            <span className="font-medium text-foreground">
              {formData.email}
            </span>
            . Please check your spam folder.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg p-3 text-sm border bg-destructive/15 text-destructive border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

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

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setStep('initial')}
          disabled={isLoading}
        >
          Back to Login
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleInitialSubmit} className="space-y-4">
      {error && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg p-3 text-sm border',
            error.toLowerCase().includes('locked') ||
              error.toLowerCase().includes('denied')
              ? 'bg-red-500/10 text-red-500 border-red-500/20'
              : error.toLowerCase().includes('warning') ||
                  error.toLowerCase().includes('security')
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                : 'bg-destructive/15 text-destructive border-destructive/20',
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email or Username</Label>
        <Input
          id="email"
          type="text"
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
        <Label htmlFor="password">Password</Label>
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

      <Captcha
        onVerify={(token) => setCaptchaToken(token)}
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
}
