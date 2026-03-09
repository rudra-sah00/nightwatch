import { AlertCircle, Mail, RefreshCw } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Captcha, type CaptchaHandle } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import { PasswordInfo } from '@/components/ui/password-info';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength';
import type { RegisterInput } from '@/features/auth/schema';
import { cn } from '@/lib/utils';
import { useSignupForm } from '../hooks/use-signup-form';

export function SignupForm() {
  const {
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
    isOtpStep,
  } = useSignupForm();

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
        <InitialRegistrationStep
          formData={formData}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          setError={setError}
          isLoading={isPending}
          captchaToken={captchaToken}
          setCaptchaToken={setCaptchaToken}
          captchaRef={captchaRef}
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
  return (
    <div className="flex items-center gap-2 rounded-lg p-3 text-sm border bg-destructive/15 text-destructive border-destructive/20 mb-4 animate-in fade-in duration-200">
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
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center space-y-2">
        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold">Verification Code</h2>
        <p className="text-sm text-muted-foreground">
          We sent a code to{' '}
          <span className="font-medium text-foreground">{email}</span>
          <br />
          <span className="text-xs text-yellow-600 dark:text-yellow-500 font-medium">
            Please check your spam folder if not found.
          </span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
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
          Back to Details
        </Button>
      </div>
    </div>
  );
});

interface InitialStepProps {
  formData: RegisterInput;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  fieldErrors: Record<string, string | undefined>;
  setFieldErrors: React.Dispatch<
    React.SetStateAction<Record<string, string | undefined>>
  >;
  setError: (val: string | null) => void;
  isLoading: boolean;
  captchaToken: string | null;
  setCaptchaToken: (val: string | null) => void;
  captchaRef: React.RefObject<CaptchaHandle | null>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  action: (formData: FormData) => void;
}

const InitialRegistrationStep = React.memo(function InitialRegistrationStep({
  formData,
  confirmPassword,
  setConfirmPassword,
  fieldErrors,
  setFieldErrors,
  setError,
  isLoading,
  captchaToken,
  setCaptchaToken,
  captchaRef,
  handleChange,
  action,
}: InitialStepProps) {
  const isMatch = formData.password === confirmPassword;

  return (
    <form action={action} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={handleChange}
          error={fieldErrors.name}
          autoComplete="name"
          disabled={isLoading}
          className="bg-secondary/50"
        />
        {!fieldErrors.name ? (
          <p className="text-xs text-muted-foreground">
            Please enter your real name for a personalized experience
          </p>
        ) : null}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          name="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          autoComplete="email"
          disabled={isLoading}
          className="bg-secondary/50"
        />
        {!fieldErrors.email ? (
          <p className="text-xs text-muted-foreground">
            We'll send a verification code to this email
          </p>
        ) : null}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <PasswordInfo />
        </div>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="Create a strong password"
          value={formData.password}
          onChange={handleChange}
          error={fieldErrors.password}
          autoComplete="new-password"
          disabled={isLoading}
          className="bg-secondary/50"
        />
        <PasswordStrengthIndicator password={formData.password} />
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword) {
              setFieldErrors((prev: Record<string, string | undefined>) => ({
                ...prev,
                confirmPassword: '',
              }));
            }
            setError(null);
          }}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
          disabled={isLoading}
          className="bg-secondary/50"
        />
        {!fieldErrors.confirmPassword && confirmPassword ? (
          <p
            className={cn(
              'text-xs',
              isMatch ? 'text-green-600' : 'text-amber-600',
            )}
          >
            {isMatch ? '✓ Passwords match' : '⚠ Passwords do not match'}
          </p>
        ) : null}
      </div>

      <input type="hidden" name="captchaToken" value={captchaToken || ''} />
      <input
        type="hidden"
        name="inviteCode"
        value={formData.inviteCode || ''}
      />
      <Captcha
        ref={captchaRef}
        onVerify={setCaptchaToken}
        onError={() => setCaptchaToken(null)}
        onExpire={() => setCaptchaToken(null)}
      />

      <Button
        type="submit"
        size="lg"
        isLoading={isLoading}
        disabled={!captchaToken || isLoading}
        className="w-full text-base font-semibold mt-2"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
});
