import { RefreshCw } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Captcha, type CaptchaHandle } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import { useLoginForm } from '../hooks/use-login-form';

export function LoginForm() {
  const {
    setStep,
    isLoading,
    captchaToken,
    setCaptchaToken,
    formData,
    otp,
    setOtp,
    isPending,
    action,
    handleChange,
    handleResend,
    handleOtpSubmit,
    isOtpStep,
  } = useLoginForm();

  const captchaRef = React.useRef<CaptchaHandle>(null);

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
          {isOtpStep ? 'Verify' : 'Enter'}
        </h2>
        <p className="font-body font-semibold text-[8px] md:text-[9px] text-[#1a1a1a] opacity-60 uppercase tracking-widest">
          {isOtpStep ? 'ACCESS VERIFICATION' : 'ACCESS YOUR LOUNGE'}
        </p>
      </div>

      <div className="flex-grow flex flex-col justify-start">
        {isOtpStep ? (
          <OtpStep
            email={formData.email}
            otp={otp}
            setOtp={setOtp}
            onSubmit={handleOtpSubmit}
            onResend={handleResend}
            onBack={() => setStep('initial')}
            isLoading={isLoading}
          />
        ) : (
          <InitialLoginStep
            formData={formData}
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
}

const OtpStep = React.memo(function OtpStep({
  email,
  otp,
  setOtp,
  onSubmit,
  onResend,
  onBack,
  isLoading,
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
        className="w-full bg-[#1a1a1a] hover:bg-[#333333] text-white border-4 border-[#1a1a1a] py-4 text-base font-black uppercase tracking-tighter neo-shadow-sm neo-shadow-hover neo-shadow-active transition-all rounded-none h-auto"
      >
        Verify & Sign In
      </Button>

      <div className="flex flex-col gap-2 mt-2 pt-3 border-t-4 border-[#1a1a1a]">
        <Button
          type="button"
          onClick={onResend}
          disabled={isLoading}
          className="w-full bg-transparent hover:bg-[#f2ede5] text-[#1a1a1a] border-4 border-[#1a1a1a] py-3 text-[10px] md:text-xs font-bold uppercase tracking-tight neo-shadow-sm neo-shadow-hover transition-all rounded-none h-auto flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-3 w-3" /> Resend Code
        </Button>

        <Button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="w-full bg-transparent hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] border-4 border-[#1a1a1a] py-3 text-[10px] md:text-xs font-bold uppercase tracking-tight transition-all rounded-none h-auto"
        >
          Back to Login
        </Button>
      </div>
    </form>
  );
});

interface InitialStepProps {
  formData: Record<string, string>;
  isLoading: boolean;
  captchaToken: string | null;
  setCaptchaToken: (val: string | null) => void;
  captchaRef: React.RefObject<CaptchaHandle | null>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  action: (formData: FormData) => void;
}

const InitialLoginStep = React.memo(function InitialLoginStep({
  formData,
  isLoading,
  captchaToken,
  setCaptchaToken,
  captchaRef,
  handleChange,
  action,
}: InitialStepProps) {
  return (
    <form action={action} className="space-y-2 w-full px-1">
      <div className="space-y-2">
        <div>
          <Label
            htmlFor="email"
            className="block font-headline font-bold uppercase text-[10px] md:text-zs tracking-widest mb-0.5 text-[#1a1a1a]"
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
            autoComplete="username"
            disabled={isLoading}
            className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 px-3 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-sm !h-[42px]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <Label
              htmlFor="password"
              className="block font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest text-[#1a1a1a]"
            >
              Password
            </Label>
            <a
              href="/forgot-password"
              className="font-headline font-bold uppercase text-[10px] md:text-xs tracking-widest text-[#e63b2e] hover:underline"
            >
              Forgot?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            disabled={isLoading}
            className="w-full !bg-[#f2ede5] !border-x-0 !border-t-0 !border-b-4 !border-[#1a1a1a] !rounded-none p-2 px-3 font-body focus:!outline-none focus:!bg-white focus:!ring-0 transition-colors !text-[#1a1a1a] text-sm !h-[42px]"
          />
        </div>
      </div>

      <input type="hidden" name="captchaToken" value={captchaToken || ''} />

      <div className="pt-1 scale-[0.9] md:scale-95 origin-left">
        <Captcha
          ref={captchaRef}
          onVerify={setCaptchaToken}
          onError={() => setCaptchaToken(null)}
          onExpire={() => setCaptchaToken(null)}
        />
      </div>

      <Button
        type="submit"
        isLoading={isLoading}
        disabled={!captchaToken || isLoading}
        className="w-full bg-[#ffcc00] hover:bg-[#ffe066] text-[#1a1a1a] border-4 border-[#1a1a1a] py-3 md:py-3.5 text-lg md:text-xl font-black uppercase tracking-tighter neo-shadow-sm neo-shadow-hover neo-shadow-active transition-all rounded-none h-auto mt-0.5"
      >
        {isLoading ? 'Verifying...' : 'Launch Sync'}
      </Button>
    </form>
  );
});
