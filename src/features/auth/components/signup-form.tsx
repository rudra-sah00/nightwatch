'use client';

import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import { PasswordInfo } from '@/components/ui/password-info';
import type { useSignupForm } from '../hooks/use-signup-form';
import { getPasswordStrength } from '../schema';
import { AuthCard } from './auth-card';

export function SignupForm(props: ReturnType<typeof useSignupForm>) {
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations('auth');
  const {
    step,
    setStep,
    isPending,
    formData,
    handleChange,
    action,
    error,
    captchaToken,
    setCaptchaToken,
    captchaRef,
    otp,
    setOtp,
    handleOtpSubmit,
    handleResend,
    countdown,
    isLoading,
    usernameStatus,
    confirmPassword,
    setConfirmPassword,
    setError,
  } = props;

  const normalizedUsername = formData.username.trim();
  const isUsernameLocallyValid = /^[a-z0-9_]{3,}$/i.test(normalizedUsername);
  const isUsernameCheckBlocking =
    usernameStatus === 'checking' ||
    usernameStatus === 'taken' ||
    usernameStatus === 'invalid';

  const getHeader = () => {
    switch (step) {
      case 'otp':
        return t('title.verify');
      case 'name':
        return t('title.discovery');
      case 'details':
        return t('title.security');
      default:
        return t('title.discovery');
    }
  };

  return (
    <AuthCard title={getHeader()} className="h-[440px]">
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

      {step === 'name' && (
        <form
          onSubmit={(e) => e.preventDefault()}
          className="h-full flex flex-col justify-between pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none"
        >
          {/* TOP */}
          <div className="flex flex-col gap-3">
            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="name"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  {t('signup.name')}
                </Label>
              </div>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder={t('signup.namePlaceholder')}
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-[background-color,border-color,color,box-shadow] relative"
              />
            </div>

            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="username"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  {t('signup.username')}
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder={t('signup.usernamePlaceholder')}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isPending}
                  className="h-[46px] text-xs font-black uppercase transition-[background-color,border-color,color,box-shadow] relative"
                />
                {usernameStatus && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-border/20 border-t-primary animate-spin" />
                    )}
                    {usernameStatus === 'available' && (
                      <span className="text-emerald-600 font-black text-xs">
                        ✓
                      </span>
                    )}
                    {usernameStatus === 'taken' && (
                      <span className="text-neo-red font-black text-xs">✗</span>
                    )}
                    {usernameStatus === 'invalid' && (
                      <span className="text-neo-red font-black text-xs">!</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="email"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  {t('signup.emailAddress')}
                </Label>
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('signup.emailPlaceholder')}
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                spellCheck={false}
                value={formData.email}
                onChange={handleChange}
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-[background-color,border-color,color,box-shadow] relative"
              />
            </div>
          </div>

          {/* BOTTOM */}
          <div className="flex flex-col gap-2 pb-0.5 mt-auto">
            <Button
              type="button"
              onClick={() => setStep('details')}
              variant="default"
              size="xl"
              disabled={
                !formData.name?.trim() ||
                !formData.email?.trim() ||
                !normalizedUsername ||
                !isUsernameLocallyValid ||
                isUsernameCheckBlocking ||
                isPending
              }
              className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter"
            >
              {t('signup.confirmIdentity')}
            </Button>
            <div className="h-[42px] w-full shrink-0" aria-hidden="true" />
          </div>
        </form>
      )}

      {step === 'details' && (
        <form
          action={action}
          className="h-full flex flex-col pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none"
        >
          {/* Preserve state from previous step */}
          <input type="hidden" name="name" value={formData.name || ''} />
          <input
            type="hidden"
            name="username"
            value={formData.username || ''}
          />
          <input type="hidden" name="email" value={formData.email || ''} />
          <input
            type="hidden"
            name="inviteCode"
            value={formData.inviteCode || ''}
          />

          {/* TOP */}
          <div className="flex flex-col gap-3">
            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="password"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  {t('signup.password')}
                </Label>
                <div className="flex items-center h-full">
                  <PasswordInfo />
                </div>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
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
              {formData.password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${getPasswordStrength(formData.password).score}%`,
                        backgroundColor: getPasswordStrength(formData.password)
                          .color,
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] font-headline font-bold uppercase tracking-widest"
                    style={{
                      color: getPasswordStrength(formData.password).color,
                    }}
                  >
                    {t(getPasswordStrength(formData.password).label)}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full shrink-0">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="confirmPassword"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  {t('signup.confirmPassword')}
                </Label>
              </div>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword?.(e.target.value)
                }
                disabled={isPending}
                className="h-[46px] text-xs font-black uppercase transition-[background-color,border-color,color,box-shadow] relative tracking-[0.2em]"
              />
            </div>
          </div>

          {/* MIDDLE: Captcha centrally placed so its spacing is perfectly equal from top and bottom */}
          <div className="flex justify-center items-center my-auto min-h-[68px]">
            <input
              type="hidden"
              name="captchaToken"
              value={captchaToken || ''}
            />
            <Captcha
              ref={captchaRef}
              onVerify={(token) => {
                setCaptchaToken(token);
                if (error?.toLowerCase().includes('security')) {
                  setError(null);
                }
              }}
              onError={() => {
                setCaptchaToken(null);
                const message = t('errors.captchaLoadFailed');
                setError(message);
                toast.error(message);
              }}
              onExpire={() => {
                setCaptchaToken(null);
                const message = t('errors.captchaExpired');
                setError(message);
                toast.error(message);
              }}
              variant="bottom"
            />
          </div>

          {/* BOTTOM */}
          <div className="flex flex-col gap-2 pb-0.5 mt-auto mb-6">
            <Button
              type="submit"
              variant="neo-yellow"
              size="xl"
              isLoading={isPending}
              disabled={
                !captchaToken ||
                !formData.password?.trim() ||
                !confirmPassword?.trim() ||
                isPending
              }
              className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter"
            >
              {isPending ? t('signup.initiating') : t('signup.beginArchive')}
            </Button>
            <Button
              type="button"
              onClick={() => setStep('name')}
              variant="neo-outline"
              size="xl"
              className="w-full h-[42px] text-sm font-black tracking-widest py-0 box-border shrink-0 uppercase italic font-headline"
            >
              <ArrowLeft className="h-4 w-4 mr-2 inline" />
              {t('signup.revert')}
            </Button>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
