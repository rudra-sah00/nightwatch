'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { useLoginForm } from '../hooks/use-login-form';
import { AuthCard } from './auth-card';

export function LoginForm(props: ReturnType<typeof useLoginForm>) {
  const {
    step,
    setStep,
    isPending,
    formData,
    handleChange,
    action,
    captchaToken,
    setCaptchaToken,
    otp,
    setOtp,
    handleOtpSubmit,
    handleResend,
    countdown,
    isLoading,
  } = props;

  const getHeader = () => {
    switch (step) {
      case 'otp':
        return 'VERIFY';
      default:
        return 'ENTRANCE';
    }
  };

  return (
    <AuthCard title={getHeader()} className="h-[440px]">
      {step === 'otp' && (
        <div className="h-full flex flex-col pt-1 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex flex-col justify-start">
            <p className="text-[10px] font-body font-black text-foreground uppercase tracking-[0.18em] opacity-80 text-center mb-2">
              CODE DISPATCHED TO
            </p>
            <p className="font-black border-b-2 border-border text-center py-1.5 tracking-tighter text-lg italic mb-5 leading-tight">
              {formData.email}
            </p>
            <div className="w-full shrink-0 mt-2">
              <div className="flex items-center justify-center h-4 mb-2">
                <Label
                  htmlFor="otp"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  SECURITY CODE
                </Label>
              </div>
              <Input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 6) setOtp(val);
                }}
                disabled={isLoading}
                className="h-[46px] text-base font-black uppercase text-center tracking-[0.5em] transition-all relative"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pb-0.5 mt-8">
            <Button
              onClick={handleOtpSubmit}
              variant="neo-yellow"
              size="xl"
              isLoading={isLoading}
              disabled={isLoading || (otp?.length || 0) !== 6}
              className="w-full h-[52px] font-headline uppercase italic tracking-tighter text-sm font-black shrink-0"
            >
              VERIFY ACCESS
            </Button>
            <Button
              type="button"
              onClick={handleResend}
              variant="neo-outline"
              size="xl"
              disabled={isLoading || (countdown || 0) > 0}
              className="w-full h-[42px] text-sm font-black tracking-widest py-0 box-border shrink-0 uppercase italic font-headline transition-all hover:bg-[#ffcc00]/10"
            >
              {(countdown || 0) > 0 ? `RETRY IN ${countdown}S` : 'RESEND KEY'}
            </Button>
          </div>
        </div>
      )}

      {step === 'initial' && (
        <form
          action={action}
          className="h-full flex flex-col pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {/* TOP: Inputs */}
          <div className="flex flex-col gap-3">
            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="email"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  EMAIL OR USERNAME
                </Label>
              </div>
              <Input
                id="email"
                name="email"
                type="text"
                placeholder="ARCHITECT@BAUHAUS.DE OR WALTER_1919"
                value={formData.email}
                onChange={handleChange}
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-all relative"
              />
            </div>

            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="password"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  PASSWORD
                </Label>
                <button
                  type="button"
                  onClick={() => setStep('forgot')}
                  className="font-headline font-bold uppercase text-[9px] tracking-widest text-[#e63b2e] hover:underline whitespace-nowrap leading-none"
                >
                  Forgot?
                </button>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-all relative tracking-[0.2em]"
              />
            </div>
          </div>

          {/* MIDDLE: Captcha centrally placed so its spacing is perfectly equal from top and bottom */}
          <div className="flex justify-center items-center min-h-[68px] mt-6 mb-6">
            <input
              type="hidden"
              name="captchaToken"
              value={captchaToken || ''}
            />
            <Captcha
              onVerify={setCaptchaToken}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
              variant="bottom"
            />
          </div>

          {/* BOTTOM: Action Button */}
          <div className="flex flex-col gap-2 pb-0.5">
            <Button
              type="submit"
              variant="neo-yellow"
              size="xl"
              isLoading={isPending}
              disabled={
                !captchaToken ||
                isPending ||
                !formData.email?.trim() ||
                !formData.password?.trim()
              }
              className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter"
            >
              {isPending ? 'SYNCING...' : 'ESTABLISH LINK'}
            </Button>
            {/* The Login form has no second 'Back' button, returning to uniform styling */}
          </div>
        </form>
      )}
    </AuthCard>
  );
}
