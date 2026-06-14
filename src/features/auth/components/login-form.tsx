'use client';

import { Eye, EyeOff, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import {
  getGoogleOAuthUrl,
  googleLogin,
  nativeGoogleSignIn,
} from '../google-api';
import type { useLoginForm } from '../hooks/use-login-form';
import { AuthCard } from './auth-card';

/**
 * Login form with a two-step flow rendered inside an {@link AuthCard}.
 *
 * **Step `'initial'`** — email + password fields, a Turnstile captcha widget,
 * and a "Forgot password?" link that switches to the forgot-password step.
 * The password field has a show/hide toggle. Submission is blocked until the
 * captcha is verified and both fields are non-empty.
 *
 * **Step `'otp'`** — shown after the server requires email verification.
 * Displays the target email, a 6-digit OTP input, a verify button, and a
 * resend button with a countdown timer. A back button in the {@link AuthCard}
 * title row returns to the initial step.
 *
 * All form state and handlers are provided by the {@link useLoginForm} hook
 * and passed in as props (render-props pattern).
 *
 * @param props - Return value of {@link useLoginForm}.
 * @returns The login form element.
 */
export function LoginForm(
  props: ReturnType<typeof useLoginForm> & { onShowQr?: () => void },
) {
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
        ) : props.onShowQr ? (
          <button
            type="button"
            onClick={props.onShowQr}
            className="text-foreground/40 hover:text-foreground transition-colors"
            aria-label="QR Login"
          >
            <QrCode className="w-5 h-5" />
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
                data-allow-clipboard
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
                data-allow-clipboard
                className="h-[46px] text-xs font-black transition-[background-color,border-color,color,box-shadow] relative"
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
                  className="h-[46px] text-xs font-black transition-[background-color,border-color,color,box-shadow] relative tracking-[0.2em] pr-10"
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

          {/* BOTTOM: Action Button — shows Google sign-in when fields empty, login when filled */}
          <div className="flex flex-col gap-2 pb-0.5">
            {!formData.email?.trim() && !formData.password?.trim() ? (
              <Button
                type="button"
                variant="neo-yellow"
                size="xl"
                onClick={async () => {
                  if (window.Capacitor?.isNativePlatform?.()) {
                    try {
                      const idToken = await nativeGoogleSignIn();
                      const response = await googleLogin({ idToken });
                      if (response.user) {
                        const { storeUser } = await import('@/lib/auth');
                        const { setTokenExpiration } = await import(
                          '@/lib/fetch'
                        );
                        const { useAuthStore } = await import(
                          '@/store/use-auth-store'
                        );
                        storeUser(response.user);
                        useAuthStore.getState().setUser(response.user);
                        if (response.expiresIn)
                          setTokenExpiration(response.expiresIn);
                      }
                    } catch (err: unknown) {
                      const { toast } = await import('sonner');
                      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
                      toast.error(msg);
                    }
                  } else {
                    window.location.href = getGoogleOAuthUrl('login');
                  }
                }}
                className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter gap-2"
              >
                <GoogleIcon />
                {t('googleSignIn')}
              </Button>
            ) : (
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
            )}
          </div>
        </form>
      )}
    </AuthCard>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
