'use client';

import { AlertCircle, Mail, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import { Button, Input, Label } from '@/components/ui';
import { Captcha } from '@/components/ui/captcha';
import { OtpInput } from '@/components/ui/otp-input';
import { type RegisterInput, registerSchema } from '@/features/auth';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';

type Step = 'initial' | 'otp';

export function SignupForm() {
  const { register, verifyOtp, resendOtp } = useAuth();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [formData, setFormData] = useState<RegisterInput>({
    name: '',
    email: '',
    password: '',
    inviteCode: '',
  });

  const [otp, setOtp] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    inviteCode?: string;
  }>({});

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

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!captchaToken) {
      setError('Please complete the security verification.');
      return;
    }

    // Pass captchaToken to schema check? Schema includes optional captchaToken
    const result = registerSchema.safeParse({ ...formData, captchaToken });
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
      const response = await register({ ...formData, captchaToken });

      if (response.requiresOtp) {
        setStep('otp');
        setError(null);
      }
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const [countdown, setCountdown] = useState(30); // Initial 30s cooldown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (step === 'otp') {
      // Start initial countdown
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
      // Reset countdown (simple local logic, backend enforces real limit)
      setCountdown(60);
      // Start timer
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

      // Show success toast? Or inline message?
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Resend failed. Please wait.');
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
      // AuthProvider handles success redirect via User state
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
            <br />
            <span className="text-xs text-yellow-600 dark:text-yellow-500 font-medium">
              Please check your spam folder if not found.
            </span>
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg p-3 text-sm border bg-destructive/15 text-destructive border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleOtpSubmit} className="space-y-6">
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
            Verify & Complete Signup
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleResend}
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
            onClick={() => setStep('initial')}
            disabled={isLoading}
          >
            Back to Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleInitialSubmit} className="space-y-4">
      {error && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg p-3 text-sm border',
            'bg-destructive/15 text-destructive border-destructive/20',
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          name="name"
          placeholder="John Doe"
          value={formData.name}
          onChange={handleChange}
          error={fieldErrors.name}
          autoComplete="name"
          disabled={isLoading}
          className="bg-secondary/50"
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          name="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          autoComplete="email"
          disabled={isLoading}
          className="bg-secondary/50"
        />
      </div>

      {/* Password */}
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
          autoComplete="new-password"
          disabled={isLoading}
          className="bg-secondary/50"
        />
      </div>

      {/* Invite Code (Read-Only) */}
      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite Code</Label>
        <Input
          id="inviteCode"
          type="text"
          name="inviteCode"
          placeholder="Invite code required"
          value={formData.inviteCode}
          onChange={handleChange}
          error={fieldErrors.inviteCode}
          disabled={isLoading || !!searchParams.get('invite')} // Disable if from URL
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
        Continue to Verification
      </Button>
    </form>
  );
}
