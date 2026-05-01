'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import type { useLoginForm } from '../hooks/use-login-form';
import { AuthCard } from './auth-card';

export function LoginForm(props: ReturnType<typeof useLoginForm>) {
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations('auth');
  const {
    step,
    setStep,
    isPending,
    formData,
    handleChange,
    action,
    captchaToken,
    setCaptchaToken,
    captchaRef,
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
        return t('title.verify');
      default:
        return t('title.entrance');
    }
  };

  return (
    <AuthCard
      title={getHeader()}
      className="h-[440px]"
      action={
        step === 'otp' ? (
          <button
            type="button"
            onClick={() => setStep('initial')}
            className="font-headline font-black uppercase text-xs tracking-widest text-foreground/40 hover:text-foreground transition-colors"
          >
            {t('otp.back')}
          </button>
        ) : undefined
      }
    >
      {step === 'otp' && (
        <form
          onSubmit={handleOtpSubmit}
          className="h-full flex flex-col pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-reduce:animate-none"
        >
          <div className="flex flex-col justify-start">
            <p className="text-[10px] font-body font-black text-foreground uppercase tracking-[0.18em] opacity-80 text-center mb-2">
              {t('otp.sentTo')}
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
                  {t('otp.label')}
                </Label>
              </div>
              <OtpInput
                id="otp"
                name="otp"
                placeholder="000000"
                value={otp || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  if (val.length <= 6) setOtp(val);
                }}
                disabled={isLoading}
                className="h-[46px] text-base font-black uppercase text-center tracking-[0.5em] transition-[background-color,border-color,color,box-shadow] relative"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pb-0.5 mt-8">
            <Button
              type="submit"
              variant="neo-yellow"
              size="xl"
              isLoading={isLoading}
              disabled={isLoading || (otp?.length || 0) !== 6}
              className="w-full h-[52px] font-headline uppercase italic tracking-tighter text-sm font-black shrink-0"
            >
              {t('otp.verify')}
            </Button>
            <Button
              type="button"
              onClick={handleResend}
              variant="neo-outline"
              size="xl"
              disabled={isLoading || (countdown || 0) > 0}
              className="w-full h-[42px] text-sm font-black tracking-widest py-0 box-border shrink-0 uppercase italic font-headline"
            >
              {(countdown || 0) > 0
                ? t('otp.retryIn', { seconds: countdown })
                : t('otp.resend')}
            </Button>
          </div>
        </form>
      )}

      {step === 'initial' && (
        <form
          action={action}
          className="h-full flex flex-col pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none"
        >
          {/* TOP: Inputs */}
          <div className="flex flex-col gap-3">
            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="email"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  {t('email.label')}
                </Label>
              </div>
              <Input
                id="email"
                name="email"
                type="text"
                placeholder={t('email.placeholder')}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={formData.email}
                onChange={handleChange}
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-[background-color,border-color,color,box-shadow] relative"
              />
            </div>

            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="password"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  {t('password.label')}
                </Label>
                <button
                  type="button"
                  onClick={() => setStep('forgot')}
                  className="font-headline font-bold uppercase text-[9px] tracking-widest text-neo-red hover:underline focus-visible:underline focus-visible:outline-none whitespace-nowrap leading-none"
                >
                  {t('password.forgot')}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isPending}
                  className="h-[46px] text-xs font-black uppercase transition-[background-color,border-color,color,box-shadow] relative tracking-[0.2em] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={
                    showPassword ? t('hidePassword') : t('showPassword')
                  }
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
              ref={captchaRef}
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
              {t('submit')}
            </Button>
            {/* The Login form has no second 'Back' button, returning to uniform styling */}
          </div>
        </form>
      )}
    </AuthCard>
  );
}
