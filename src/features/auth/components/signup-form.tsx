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
import { AuthCard } from './auth-card';
import { GoogleSignUpButton } from './google-sign-up-button';

/** A single identity field collected on its own wizard step. */
interface IdentityField {
  /** Wizard step that renders this field. */
  step: 'name' | 'username' | 'email';
  /** Key of {@link RegisterInput} this field writes to. */
  name: 'name' | 'username' | 'email';
  labelKey: string;
  placeholderKey: string;
  type: 'text' | 'email';
  autoComplete: string;
  autoCapitalize?: 'none';
  inputMode?: 'email';
  spellCheck?: boolean;
  allowClipboard?: boolean;
}

/**
 * Identity fields, collected strictly one per step.
 *
 * Splitting these out of a single crowded step is what keeps the fixed-height
 * {@link AuthCard} from overflowing: one 46 px input plus its label always fits
 * the available body height with room for the action cluster.
 */
const IDENTITY_FIELDS: readonly IdentityField[] = [
  {
    step: 'name',
    name: 'name',
    labelKey: 'signup.name',
    placeholderKey: 'signup.namePlaceholder',
    type: 'text',
    autoComplete: 'name',
  },
  {
    step: 'username',
    name: 'username',
    labelKey: 'signup.username',
    placeholderKey: 'signup.usernamePlaceholder',
    type: 'text',
    autoComplete: 'username',
    autoCapitalize: 'none',
    spellCheck: false,
  },
  {
    step: 'email',
    name: 'email',
    labelKey: 'signup.emailAddress',
    placeholderKey: 'signup.emailPlaceholder',
    type: 'email',
    autoComplete: 'email',
    autoCapitalize: 'none',
    inputMode: 'email',
    spellCheck: false,
    allowClipboard: true,
  },
] as const;

/**
 * Multi-step signup form rendered inside an {@link AuthCard}.
 *
 * **Identity steps `'name'` → `'username'` → `'email'`** (Discovery) — collect
 * one field per step. The username step additionally shows a live availability
 * indicator (✓/✗/spinner) and blocks advancing while the name is being checked,
 * is taken, or fails `/^[a-z0-9_]{3,}$/i`. The first step offers Google sign-up
 * as an alternative; later steps offer a Back button instead. A progress bar
 * shows position without needing localised copy.
 *
 * **Step `'details'`** (Security) — password + confirm-password fields with a
 * show/hide toggle, a {@link PasswordInfo} tooltip, a Turnstile captcha, and
 * a submit button. Hidden inputs preserve the identity fields.
 *
 * **Step `'otp'`** (Verify) — 6-digit OTP input sent to the provided email,
 * with verify and resend (countdown timer) buttons.
 *
 * Every step is a `min-h-0` flex column so content shrinks rather than
 * escaping the card, and the flexible field area is centred so a short step
 * does not leave a void at the bottom.
 *
 * All form state and handlers are provided by the {@link useSignupForm} hook.
 *
 * @param props - Return value of {@link useSignupForm}.
 * @returns The signup form element.
 */
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

  const identityIndex = IDENTITY_FIELDS.findIndex((f) => f.step === step);
  const activeField =
    identityIndex >= 0 ? IDENTITY_FIELDS[identityIndex] : null;
  const isLastIdentityStep = identityIndex === IDENTITY_FIELDS.length - 1;
  const prevIdentityStep = IDENTITY_FIELDS[identityIndex - 1]?.step;
  const nextIdentityStep = isLastIdentityStep
    ? 'details'
    : IDENTITY_FIELDS[identityIndex + 1]?.step;

  /** Whether the current identity step's value is good enough to advance. */
  const canAdvance = (() => {
    if (!activeField) return false;
    if (activeField.name === 'username') {
      return (
        !!normalizedUsername &&
        isUsernameLocallyValid &&
        !isUsernameCheckBlocking
      );
    }
    return !!formData[activeField.name]?.trim();
  })();

  const getHeader = () => {
    switch (step) {
      case 'otp':
        return t('title.verify');
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
          className="h-full min-h-0 flex flex-col pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-reduce:animate-none"
        >
          <div className="flex flex-col justify-start">
            <p className="text-[10px] font-body font-black text-foreground uppercase tracking-[0.18em] opacity-80 text-center mb-2">
              {t('otp.sentTo')}
            </p>
            <p className="font-black border-b-2 border-border text-center py-1.5 tracking-tighter text-lg italic mb-5 leading-tight truncate">
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
                placeholder="······"
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

          <div className="shrink-0 flex flex-col gap-2 pb-0.5 mt-auto">
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

      {activeField && (
        <form
          key={activeField.step}
          onSubmit={(e) => {
            e.preventDefault();
            if (canAdvance && !isPending && nextIdentityStep) {
              setStep(nextIdentityStep);
            }
          }}
          className="h-full min-h-0 flex flex-col pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-reduce:animate-none"
        >
          {/* ── PROGRESS ── purely visual, so it needs no localised copy ── */}
          <div
            className="shrink-0 flex items-center gap-1.5"
            role="img"
            aria-label={`${identityIndex + 1} / ${IDENTITY_FIELDS.length}`}
          >
            {IDENTITY_FIELDS.map((f, i) => (
              <span
                key={f.step}
                className={`h-1.5 flex-1 border-2 border-border transition-colors ${
                  i <= identityIndex ? 'bg-foreground' : 'bg-transparent'
                }`}
              />
            ))}
          </div>

          {/* ── FIELD ──
              flex-1 + min-h-0 lets this region shrink instead of pushing
              content out of the fixed-height card; justify-center keeps the
              group optically centred so the step never looks empty. */}
          <div className="flex-1 min-h-0 flex flex-col justify-center gap-2.5">
            {/* Recap of already-captured fields. Uses the slack a single-field
                step would otherwise leave blank, lets the user spot a typo,
                and doubles as a shortcut back to that step. */}
            {IDENTITY_FIELDS.slice(0, identityIndex).map((f) => (
              <button
                key={f.step}
                type="button"
                onClick={() => setStep(f.step)}
                className="w-full text-left group flex items-baseline gap-2 border-b-2 border-border/40 pb-1 hover:border-border transition-colors"
              >
                <span className="text-[9px] shrink-0 uppercase tracking-tighter font-bold opacity-50 leading-none">
                  {t(f.labelKey)}
                </span>
                <span className="text-[11px] font-black truncate ml-auto opacity-70 group-hover:opacity-100 transition-opacity">
                  {formData[f.name]}
                </span>
              </button>
            ))}

            <div className="w-full">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor={activeField.name}
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  {t(activeField.labelKey)}
                </Label>
              </div>
              <div className="relative">
                <Input
                  id={activeField.name}
                  name={activeField.name}
                  type={activeField.type}
                  placeholder={t(activeField.placeholderKey)}
                  autoComplete={activeField.autoComplete}
                  autoCapitalize={activeField.autoCapitalize}
                  inputMode={activeField.inputMode}
                  spellCheck={activeField.spellCheck}
                  value={formData[activeField.name]}
                  onChange={handleChange}
                  disabled={isPending}
                  data-allow-clipboard={activeField.allowClipboard || undefined}
                  className="h-[46px] text-xs font-black transition-[background-color,border-color,color,box-shadow] relative"
                />
                {activeField.name === 'username' && usernameStatus && (
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
          </div>

          {/* ── ACTIONS ── */}
          <div className="shrink-0 flex flex-col gap-2 pb-0.5">
            <Button
              type="submit"
              variant="default"
              size="xl"
              disabled={!canAdvance || isPending}
              className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter"
            >
              {isLastIdentityStep
                ? t('signup.confirmIdentity')
                : t('signup.next')}
            </Button>

            {prevIdentityStep ? (
              <Button
                type="button"
                onClick={() => setStep(prevIdentityStep)}
                variant="neo-outline"
                size="xl"
                className="w-full h-[42px] text-sm font-black tracking-widest py-0 box-border shrink-0 uppercase italic font-headline"
              >
                <ArrowLeft className="h-4 w-4 mr-2 inline" />
                {t('signup.revert')}
              </Button>
            ) : (
              <>
                <div className="relative flex items-center my-1">
                  <div className="flex-grow border-t-2 border-border" />
                  <span className="px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {t('or')}
                  </span>
                  <div className="flex-grow border-t-2 border-border" />
                </div>
                <GoogleSignUpButton />
              </>
            )}
          </div>
        </form>
      )}

      {step === 'details' && (
        <form
          action={action}
          className="h-full min-h-0 flex flex-col pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none"
        >
          {/* Preserve state from the identity steps */}
          <input type="hidden" name="name" value={formData.name || ''} />
          <input
            type="hidden"
            name="username"
            value={formData.username || ''}
          />
          <input type="hidden" name="email" value={formData.email || ''} />

          {/* TOP */}
          <div className="shrink-0 flex flex-col gap-3">
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
                className="h-[46px] text-xs font-black transition-[background-color,border-color,color,box-shadow] relative tracking-[0.2em]"
              />
            </div>
          </div>

          {/* MIDDLE: captcha absorbs the slack so its spacing stays even */}
          <div className="flex-1 min-h-0 flex justify-center items-center">
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
          <div className="shrink-0 flex flex-col gap-2 pb-0.5">
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
              onClick={() => setStep('email')}
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
