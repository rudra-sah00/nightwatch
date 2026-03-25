import { RefreshCw } from 'lucide-react';
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
    <div className="w-full h-full flex flex-col justify-start">
      <div className="mb-6 shrink-0 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-[#1a1a1a] mb-0 font-headline">
          Watch Rudra
        </h1>
        <p className="font-headline font-bold text-[10px] uppercase tracking-[0.2em] text-[#e63b2e]">
          Form Follows Function
        </p>
      </div>

      <div className="border-b-4 border-[#1a1a1a] pb-1 mb-4 shrink-0">
        <h2 className="text-2xl font-black uppercase tracking-tighter font-headline text-[#1a1a1a]">
          {isOtpStep ? 'Verify' : 'Join'}
        </h2>
        <p className="font-body font-semibold text-[9px] text-[#1a1a1a] opacity-60 uppercase tracking-widest">
          {isOtpStep ? 'VERIFY YOUR ACCOUNT' : 'CREATE YOUR ACCOUNT'}
        </p>
      </div>

      <div className="flex-grow flex flex-col justify-center max-h-full overflow-hidden">
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
    </div>
  );
}

// --- Memoized Helper Components ---

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
      className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 w-full"
    >
      <div className="space-y-1 mb-3">
        <p className="text-[10px] md:text-xs font-body font-medium text-[#1a1a1a]">
          We sent a code to{' '}
          <span className="font-bold underline decoration-2">{email}</span>.
          Please check your spam folder.
        </p>
      </div>

      <div className="space-y-1 pb-1 px-1">
        <Label className="sr-only">One-Time Password</Label>
        <OtpInput
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-center tracking-[0.5em] text-base md:text-lg font-bold !h-[48px]"
        />
      </div>

      <Button
        type="submit"
        isLoading={isLoading}
        disabled={isLoading || otp.length !== 6}
        className="w-full bg-[#e63b2e] hover:bg-[#ff5544] text-[#ffffff] border-4 border-[#1a1a1a] py-3 text-base font-black uppercase tracking-tighter neo-shadow-sm neo-shadow-hover neo-shadow-active transition-all rounded-none h-auto"
      >
        Verify & Complete Signup
      </Button>

      <div className="flex flex-col gap-2 mt-2 pt-3 border-t-4 border-[#1a1a1a]">
        <Button
          type="button"
          onClick={onResend}
          disabled={isLoading || countdown > 0}
          className="w-full bg-white hover:bg-[#f2ede5] text-[#1a1a1a] border-4 border-[#1a1a1a] py-3 text-[10px] sm:text-xs font-bold uppercase tracking-tight neo-shadow-sm neo-shadow-hover transition-all rounded-none h-auto flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {countdown > 0 ? (
            <>Resend Code in {countdown}s</>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" /> Resend Verification Code
            </>
          )}
        </Button>

        <Button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="w-full bg-transparent hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border-4 border-[#1a1a1a] py-3 text-[10px] sm:text-xs font-bold uppercase tracking-tight transition-all rounded-none h-auto"
        >
          Back to Details
        </Button>
      </div>
    </form>
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
    <form action={action} className="space-y-3 w-full px-1">
      {/* Name */}
      <div>
        <Label
          htmlFor="name"
          className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest mb-1 text-[#1a1a1a]"
        >
          Full Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Mies van der Rohe"
          value={formData.name}
          onChange={handleChange}
          error={fieldErrors.name}
          autoComplete="name"
          disabled={isLoading}
          className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 px-3 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-sm !h-[42px]"
        />
      </div>

      {/* Email */}
      <div>
        <Label
          htmlFor="email"
          className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest mb-1 text-[#1a1a1a]"
        >
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          name="email"
          placeholder="mies@bauhaus.de"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          autoComplete="email"
          disabled={isLoading}
          className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 px-3 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-sm !h-[42px]"
        />
      </div>

      {/* Password space-y reduced to save height */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label
            htmlFor="password"
            className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest text-[#1a1a1a]"
          >
            Password
          </Label>
          <div className="scale-75 md:scale-90 origin-right">
            <PasswordInfo />
          </div>
        </div>
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
          className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 px-3 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-sm mb-1 !h-[42px]"
        />
        <div className="scale-90 origin-left mb-1">
          <PasswordStrengthIndicator password={formData.password} />
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <Label
          htmlFor="confirmPassword"
          className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest mb-1 text-[#1a1a1a]"
        >
          Confirm Password
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
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
          className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 px-3 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-sm !h-[42px]"
        />
        {!fieldErrors.confirmPassword && confirmPassword ? (
          <p
            className={cn(
              'text-[10px] uppercase font-bold tracking-widest mt-1',
              isMatch ? 'text-green-600' : 'text-[#cc0000]',
            )}
          >
            {isMatch ? '✓ PASSWORDS MATCH' : '⚠ PASSWORDS DO NOT MATCH'}
          </p>
        ) : null}
      </div>

      <input type="hidden" name="captchaToken" value={captchaToken || ''} />
      <input
        type="hidden"
        name="inviteCode"
        value={formData.inviteCode || ''}
      />

      <div className="pt-1 scale-[0.8] md:scale-95 origin-left">
        <Captcha
          ref={captchaRef}
          onVerify={setCaptchaToken}
          onError={() => setCaptchaToken(null)}
          onExpire={() => setCaptchaToken(null)}
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!captchaToken || isLoading}
          className="w-full bg-[#ffcc00] hover:bg-[#ffe066] text-[#1a1a1a] border-4 border-[#1a1a1a] py-4 md:py-5 text-xl font-black uppercase tracking-tighter neo-shadow-sm neo-shadow-hover neo-shadow-active transition-all rounded-none h-auto mt-2"
        >
          {isLoading ? 'Creating...' : 'Begin Story'}
        </Button>
      </div>
    </form>
  );
});
