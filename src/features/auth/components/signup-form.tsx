import { RefreshCw } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Captcha, type CaptchaHandle } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import { PasswordInfo } from '@/components/ui/password-info';
import type { RegisterInput } from '@/features/auth/schema';
import { useSignupForm } from '../hooks/use-signup-form';

export function SignupForm() {
  const {
    step,
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
    usernameStatus,
    isOtpStep,
  } = useSignupForm();

  return (
    <div className="w-full h-full flex flex-col justify-start">
      <div className="mb-1 shrink-0 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-[#1a1a1a] mb-0 font-headline">
          Watch Rudra
        </h1>
        <p className="font-headline font-bold text-[10px] uppercase tracking-[0.2em] text-[#e63b2e]">
          Form Follows Function
        </p>
      </div>

      <div className="border-b-4 border-[#1a1a1a] pb-0.5 mb-2 shrink-0">
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter font-headline text-[#1a1a1a]">
          {isOtpStep ? 'Verify' : step === 'name' ? 'Identity' : 'Details'}
        </h2>
        <p className="font-body font-semibold text-[8px] md:text-[9px] text-[#1a1a1a] opacity-60 uppercase tracking-widest">
          {isOtpStep
            ? 'VERIFY YOUR ACCOUNT'
            : step === 'name'
              ? 'WHO ARE YOU?'
              : 'SECURE YOUR SPOT'}
        </p>
      </div>

      <div className="flex-grow flex flex-col justify-start h-full">
        {isOtpStep ? (
          <OtpStep
            email={formData.email}
            otp={otp}
            setOtp={setOtp}
            onSubmit={handleOtpSubmit}
            onResend={handleResend}
            onBack={() => setStep('details')}
            isLoading={isLoading}
            countdown={countdown}
          />
        ) : (
          <InitialRegistrationStep
            step={step}
            setStep={setStep}
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
            usernameStatus={usernameStatus}
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
      className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 w-full px-1"
    >
      <div className="space-y-4">
        <div className="space-y-1 mb-3">
          <p className="text-[10px] md:text-[11px] font-body font-medium text-[#1a1a1a]">
            We sent a verification code to:{' '}
            <span className="font-bold border-b-2 border-[#1a1a1a] block mt-1 py-1">
              {email}
            </span>
          </p>
        </div>

        <div className="space-y-1 pb-1">
          <Label className="sr-only">One-Time Password</Label>
          <OtpInput
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-center tracking-[0.5em] text-base md:text-lg font-bold !h-[48px]"
          />
        </div>
      </div>

      <div className="flex-grow min-h-[1rem]" />

      <div className="flex flex-col gap-3 mt-auto">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading || otp.length !== 6}
          className="w-full bg-[#1a1a1a] hover:bg-[#333333] text-white border-4 border-[#1a1a1a] py-4 text-lg font-black uppercase tracking-tighter neo-shadow-sm neo-shadow-hover neo-shadow-active transition-all rounded-none h-auto"
        >
          Verify Account
        </Button>

        <div className="flex flex-col gap-2 pt-2 border-t-4 border-[#1a1a1a]">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onResend}
              disabled={isLoading || countdown > 0}
              className="flex-[2] bg-[#f2ede5] hover:bg-white text-[#1a1a1a] border-4 border-[#1a1a1a] py-2.5 text-[10px] md:text-xs font-bold uppercase tracking-tight neo-shadow-sm neo-shadow-hover transition-all rounded-none h-auto flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {countdown > 0 ? (
                <>Resend Code in {countdown}s</>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" /> Resend Code
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1 bg-transparent hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border-4 border-[#1a1a1a] py-2.5 text-[10px] md:text-xs font-bold uppercase tracking-tight transition-all rounded-none h-auto"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
});

interface InitialStepProps {
  step: 'name' | 'details' | 'otp';
  setStep: (step: 'name' | 'details' | 'otp') => void;
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
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
}

const InitialRegistrationStep = React.memo(function InitialRegistrationStep({
  step,
  setStep,
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
  usernameStatus,
}: InitialStepProps) {
  return (
    <form
      action={action}
      className="h-full flex flex-col space-y-4 w-full px-1"
    >
      {step === 'name' ? (
        <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="name"
                className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest mb-0.5 text-[#1a1a1a]"
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

            <div>
              <Label
                htmlFor="username"
                className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest mb-0.5 text-[#1a1a1a]"
              >
                Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  placeholder="mies_1920"
                  value={formData.username}
                  onChange={handleChange}
                  error={fieldErrors.username}
                  autoComplete="off"
                  disabled={isLoading}
                  className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 px-3 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-sm !h-[42px]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {usernameStatus === 'checking' && (
                    <div className="w-4 h-4 rounded-full border-2 border-[#1a1a1a]/20 border-t-[#1a1a1a] animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <span className="material-symbols-outlined text-emerald-600 text-lg font-bold">
                      check_circle
                    </span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="material-symbols-outlined text-[#e63b2e] text-lg font-bold">
                      cancel
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label
                htmlFor="email"
                className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest mb-0.5 text-[#1a1a1a]"
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
          </div>

          <div className="flex-grow min-h-[0.5rem]" />

          <div className="mt-auto">
            <Button
              type="button"
              disabled={
                !formData.name.trim() ||
                !formData.email.trim() ||
                !formData.username.trim() ||
                usernameStatus !== 'available' ||
                isLoading
              }
              onClick={() => setStep('details')}
              className="w-full bg-[#1a1a1a] hover:bg-[#333333] text-white border-4 border-[#1a1a1a] py-3.5 text-lg font-black uppercase tracking-tighter neo-shadow-sm neo-shadow-hover neo-shadow-active transition-all rounded-none h-auto disabled:opacity-50 disabled:grayscale transition-all"
            >
              Continue
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Hidden Name, Username and Email input to include in FormData */}
          <input type="hidden" name="name" value={formData.name} />
          <input type="hidden" name="username" value={formData.username} />
          <input type="hidden" name="email" value={formData.email} />

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <Label
                htmlFor="password"
                className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest text-[#1a1a1a]"
              >
                Password
              </Label>
              <div className="scale-75 origin-right">
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
              className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 px-3 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-sm !h-[42px]"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <Label
              htmlFor="confirmPassword"
              className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest mb-0.5 text-[#1a1a1a]"
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
                  setFieldErrors((prev) => ({
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
          </div>

          <input type="hidden" name="captchaToken" value={captchaToken || ''} />
          <input
            type="hidden"
            name="inviteCode"
            value={formData.inviteCode || ''}
          />

          <div className="pt-0.5 origin-left">
            <Captcha
              ref={captchaRef}
              onVerify={setCaptchaToken}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
              variant="bottom"
            />
          </div>

          <div className="flex-grow min-h-[0.5rem]" />

          <div className="mt-auto flex flex-col gap-2">
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!captchaToken || isLoading}
              className="w-full bg-[#ffcc00] hover:bg-[#ffe066] text-[#1a1a1a] border-4 border-[#1a1a1a] py-3 text-lg font-black uppercase tracking-tighter neo-shadow-sm neo-shadow-hover neo-shadow-active transition-all rounded-none h-auto"
            >
              {isLoading ? 'Creating...' : 'Begin Story'}
            </Button>

            <Button
              type="button"
              onClick={() => setStep('name')}
              disabled={isLoading}
              className="w-full bg-transparent hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border-4 border-[#1a1a1a] py-2 text-[10px] font-bold uppercase tracking-tight transition-all rounded-none h-auto"
            >
              Back to Name
            </Button>
          </div>
        </div>
      )}
    </form>
  );
});
