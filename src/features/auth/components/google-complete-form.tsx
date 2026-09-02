'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { passwordSchema } from '@/features/auth/schema';
import type {
  GoogleProfileValues,
  useGoogleAuth,
} from '../hooks/use-google-auth';
import { AuthCard } from './auth-card';

type GoogleAuth = ReturnType<typeof useGoogleAuth>;

interface GoogleCompleteFormProps {
  /** Pending signup — the verified Google profile plus the signup ticket. */
  pending: NonNullable<GoogleAuth['pending']>;
  isCompleting: boolean;
  /** Server-side "username taken", shown against the username field. */
  usernameError: string | null;
  clearUsernameError: () => void;
  onSubmit: (values: GoogleProfileValues) => void;
  onCancel: () => void;
}

/**
 * Second half of "Continue with Google" — shown only when the Google account
 * has no Nightwatch user yet.
 *
 * Collects a username and password, and lets the user correct the display name
 * Google supplied. The email is fixed: Google already verified it, which is why
 * this flow needs no OTP, so it is displayed read-only rather than as an input.
 *
 * The password is stored against that email, so the account ends up reachable
 * both through Google and through email + password.
 */
export function GoogleCompleteForm({
  pending,
  isCompleting,
  usernameError,
  clearUsernameError,
  onSubmit,
  onCancel,
}: GoogleCompleteFormProps) {
  const t = useTranslations('auth');
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState<GoogleProfileValues>({
    username: pending.suggestedUsername,
    name: pending.profile.name,
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (name === 'username' && usernameError) {
      clearUsernameError();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (values.name.trim().length < 2) {
      nextErrors.name = t('validation.nameMinLength');
    }
    if (values.username.trim().length < 3) {
      nextErrors.username = t('validation.usernameMinLength');
    } else if (!/^[a-z0-9_]+$/i.test(values.username.trim())) {
      nextErrors.username = t('validation.usernameFormat');
    }
    // Mirrors the backend policy so failures land on the field rather than
    // arriving as an untargeted "Validation failed".
    const password = passwordSchema.safeParse(values.password);
    if (!password.success) {
      nextErrors.password = t(password.error.issues[0]?.message ?? '');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      username: values.username.trim(),
      name: values.name.trim(),
      password: values.password,
    });
  };

  const fieldError = (field: string) =>
    field === 'username' ? usernameError || errors.username : errors[field];

  return (
    <AuthCard
      title={t('googleSignup.title')}
      className="h-[440px]"
      action={
        <button
          type="button"
          onClick={onCancel}
          className="font-headline font-black uppercase text-xs tracking-widest text-foreground/40 hover:text-foreground transition-colors"
        >
          {t('otp.back')}
        </button>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="h-full flex flex-col pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-reduce:animate-none"
      >
        <div className="flex flex-col gap-2.5">
          {/* Google identity — verified, so not editable. */}
          <div className="w-full shrink-0">
            <div className="flex items-center justify-between h-4 mb-1">
              <Label className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80">
                {t('signup.emailAddress')}
              </Label>
              <span className="font-headline font-bold uppercase text-[9px] tracking-widest text-foreground/40">
                {t('googleSignup.fromGoogle')}
              </span>
            </div>
            <p className="h-[42px] flex items-center px-3 border-2 border-border/60 bg-muted/40 text-xs font-black truncate">
              {pending.profile.email}
            </p>
          </div>

          <div className="w-full shrink-0">
            <div className="flex items-center justify-between h-4 mb-1">
              <Label
                htmlFor="name"
                className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
              >
                {t('signup.name')}
              </Label>
              {errors.name ? (
                <span className="text-[9px] font-bold uppercase tracking-widest text-neo-red">
                  {errors.name}
                </span>
              ) : null}
            </div>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={t('signup.namePlaceholder')}
              value={values.name}
              onChange={handleChange}
              disabled={isCompleting}
              data-allow-clipboard
              className="h-[42px] text-xs font-black"
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
              {fieldError('username') ? (
                <span className="text-[9px] font-bold uppercase tracking-widest text-neo-red">
                  {fieldError('username')}
                </span>
              ) : null}
            </div>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder={t('signup.usernamePlaceholder')}
              autoCapitalize="none"
              spellCheck={false}
              value={values.username}
              onChange={handleChange}
              disabled={isCompleting}
              data-allow-clipboard
              className="h-[42px] text-xs font-black"
            />
          </div>

          <div className="w-full shrink-0">
            <div className="flex items-center justify-between h-4 mb-1">
              <Label
                htmlFor="password"
                className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
              >
                {t('signup.password')}
              </Label>
              {errors.password ? (
                <span className="text-[9px] font-bold uppercase tracking-widest text-neo-red">
                  {errors.password}
                </span>
              ) : null}
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                value={values.password}
                onChange={handleChange}
                disabled={isCompleting}
                className="h-[42px] text-xs font-black tracking-[0.2em] pr-10"
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

        <div className="flex flex-col gap-2 pb-0.5 mt-auto pt-4">
          <Button
            type="submit"
            variant="neo-yellow"
            size="xl"
            isLoading={isCompleting}
            disabled={isCompleting}
            className="w-full h-[52px] text-sm font-black uppercase italic font-headline shrink-0 tracking-tighter"
          >
            {t('googleSignup.createAccount')}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
