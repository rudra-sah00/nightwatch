'use client';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Captcha } from '@/components/ui/captcha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { useLoginForm } from '../hooks/use-login-form';
import { AuthCard } from './auth-card';

/**
 * Forgot-password form with two visual states rendered inside an {@link AuthCard}.
 *
 * **Request step** (`step !== 'forgot_success'`) — an identifier field
 * (email or username), a Turnstile captcha, a submit button ("Dispatch"), and
 * a "Back to Login" button that returns to the initial login step.
 *
 * **Success step** (`step === 'forgot_success'`) — a confirmation message with
 * a checkmark icon instructing the user to check their email, and a "Return to
 * Entrance" button.
 *
 * Form state and handlers are provided by the {@link useLoginForm} hook.
 *
 * @param props - Return value of {@link useLoginForm}.
 * @returns The forgot-password form element.
 */
export function ForgotPasswordForm(props: ReturnType<typeof useLoginForm>) {
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
  } = props;

  const isSuccess = step === 'forgot_success';

  return (
    <AuthCard
      title={isSuccess ? t('title.success') : t('title.recovery')}
      className="h-[440px]"
    >
      {!isSuccess && (
        <form
          action={action}
          className="h-full flex flex-col pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none"
        >
          {/* TOP */}
          <div className="w-full shrink-0">
            <div className="flex items-center justify-between h-4 mb-1">
              <Label
                htmlFor="identifier"
                className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
              >
                {t('forgot.emailOrUsername')}
              </Label>
            </div>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              placeholder={t('forgot.placeholder')}
              value={formData.identifier}
              onChange={handleChange}
              disabled={isPending}
              data-allow-clipboard
              className="h-[46px] text-xs font-black transition-[background-color,border-color,color,box-shadow] relative"
            />
          </div>

          {/* MIDDLE */}
          <div className="flex justify-center items-center mt-6 mb-6 min-h-[68px]">
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

          {/* BOTTOM */}
          <div className="flex flex-col gap-2 pb-0.5">
            <Button
              type="submit"
              variant="neo-yellow"
              size="xl"
              isLoading={isPending}
              disabled={
                !captchaToken || isPending || !formData.identifier?.trim()
              }
              className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter"
            >
              {isPending ? t('forgot.dispatching') : t('forgot.dispatch')}
            </Button>
            <Button
              type="button"
              onClick={() => setStep('initial')}
              variant="neo-outline"
              size="xl"
              className="w-full h-[42px] text-sm font-black tracking-widest py-0 box-border shrink-0 uppercase italic font-headline"
            >
              <ArrowLeft className="h-4 w-4 mr-2 inline" />
              {t('forgot.backToLogin')}
            </Button>
          </div>
        </form>
      )}

      {isSuccess && (
        <div className="h-full flex flex-col justify-between pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500 motion-reduce:animate-none">
          <div className="shrink-0 flex flex-col justify-center items-center text-center gap-3 mt-4">
            <div className="h-10 w-10 border-[3px] border-border bg-neo-yellow flex items-center justify-center  shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-[13px] font-body font-black text-foreground leading-tight uppercase tracking-[0.05em]">
              {t('forgot.successMessage')}
            </p>
            <span className="font-black tracking-tighter text-sm block leading-tight uppercase opacity-80">
              {t('forgot.checkEmail')}
            </span>
          </div>

          <div className="flex flex-col gap-2 pb-0.5 mb-1 mt-auto">
            <Button
              onClick={() => setStep('initial')}
              variant="default"
              size="xl"
              className="w-full h-[52px] font-headline uppercase italic tracking-tighter text-sm font-black shrink-0"
            >
              {t('forgot.returnToEntrance')}
            </Button>
          </div>
        </div>
      )}
    </AuthCard>
  );
}
