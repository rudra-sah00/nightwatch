'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInfo } from '@/components/ui/password-info';
import { checkUsername } from '@/features/auth/api';
import { AuthCard } from '@/features/auth/components/auth-card';
import {
  GOOGLE_SIGNUP_ID_TOKEN_KEY,
  googleRegister,
} from '@/features/auth/google-api';
import { passwordSchema } from '@/features/auth/schema';
import { trackEvent } from '@/lib/analytics';
import { storeUser } from '@/lib/auth';
import { setTokenExpiration } from '@/lib/fetch';
import { useAuthStore } from '@/store/use-auth-store';

/**
 * Google signup completion page.
 *
 * The user has already proven ownership of their Google account; all that is
 * missing is a username and password. Two entry paths land here:
 *
 * - **Web / desktop** — `?code=` from the OAuth redirect, forwarded by
 *   `/auth/google/callback`.
 * - **Native (Capacitor)** — an idToken from the native account picker, handed
 *   over in sessionStorage by `GoogleSignUpButton`.
 */
export default function GoogleSignupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth');
  const tErr = useTranslations('auth.errors');

  const code = searchParams.get('code');
  const redirectedRef = useRef(false);

  // Native idToken is read in an effect — sessionStorage is unavailable during
  // prerender, and reading it while rendering would break hydration.
  const [idToken, setIdToken] = useState<string | null>(null);
  const [credentialResolved, setCredentialResolved] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  useEffect(() => {
    if (code) {
      setCredentialResolved(true);
      return;
    }
    try {
      setIdToken(sessionStorage.getItem(GOOGLE_SIGNUP_ID_TOKEN_KEY));
    } catch {
      // sessionStorage unavailable (private mode) — treated as no credential
    }
    setCredentialResolved(true);
  }, [code]);

  const hasCredential = Boolean(code || idToken);

  /** Abandon this attempt and send the user back to pick a signup method. */
  const restartSignup = useCallback(
    (message: string) => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      try {
        sessionStorage.removeItem(GOOGLE_SIGNUP_ID_TOKEN_KEY);
      } catch {}
      toast.error(message);
      router.replace('/signup');
    },
    [router],
  );

  // Redirect if we have neither an authorization code nor a native idToken
  useEffect(() => {
    if (!credentialResolved || hasCredential) return;
    restartSignup(tErr('googleAuthExpired'));
  }, [credentialResolved, hasCredential, restartSignup, tErr]);

  // Real-time username availability check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    if (!/^[a-z0-9_]+$/i.test(trimmed)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { available } = await checkUsername(trimmed);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasCredential) {
      restartSignup(tErr('googleAuthExpired'));
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      setError(t('validation.usernameMinLength'));
      return;
    }
    if (!/^[a-z0-9_]+$/i.test(trimmedUsername)) {
      setError(t('validation.usernameFormat'));
      return;
    }

    // Same policy the backend enforces — validating locally keeps the user from
    // hitting an untargeted "Validation failed" from the server.
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      const firstIssue = passwordResult.error.issues[0]?.message;
      setError(firstIssue ? t(firstIssue) : tErr('detailsInvalid'));
      return;
    }

    if (password !== confirmPassword) {
      setError(tErr('passwordsMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await googleRegister(
        code ? { code } : { idToken: idToken as string },
        { username: trimmedUsername, password },
      );

      if (response.user) {
        trackEvent('signup_complete', { method: 'google' });
        try {
          sessionStorage.removeItem(GOOGLE_SIGNUP_ID_TOKEN_KEY);
        } catch {}
        storeUser(response.user);
        useAuthStore.getState().setUser(response.user);
        if (response.expiresIn) setTokenExpiration(response.expiresIn);
        toast.success(t('googleSignup.accountCreated'));
        router.replace('/home?tour=true');
      }
    } catch (err: unknown) {
      const apiError = err as { message?: string; code?: string };

      // Google authorization codes are single-use and idTokens expire. Once the
      // credential is spent, retrying on this page can only fail again — send
      // the user back to restart the handshake instead.
      if (apiError.code === 'GOOGLE_AUTH_FAILED') {
        restartSignup(tErr('googleAuthExpired'));
        return;
      }

      const msg = apiError.message || tErr('registrationFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!(credentialResolved && hasCredential)) return null;

  const isUsernameBlocking =
    usernameStatus === 'checking' ||
    usernameStatus === 'taken' ||
    usernameStatus === 'invalid';

  return (
    <div className="bg-background text-foreground h-screen h-[100dvh] flex flex-col items-center justify-center font-body p-4">
      <div className="w-full max-w-md">
        <AuthCard title={t('googleSignup.title')}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
            <p className="text-[10px] font-body font-black text-foreground uppercase tracking-[0.18em] opacity-60 text-center mb-1">
              {t('googleSignup.subtitle')}
            </p>

            {/* Username */}
            <div className="w-full">
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
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="h-[46px] text-xs font-black"
                />
                {usernameStatus !== 'idle' && (
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

            {/* Password */}
            <div className="w-full">
              <div className="flex items-center justify-between h-4 mb-1">
                <Label
                  htmlFor="password"
                  className="text-[11px] whitespace-nowrap leading-none uppercase tracking-tighter font-bold opacity-80"
                >
                  {t('signup.password')}
                </Label>
                <PasswordInfo />
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-[46px] text-xs font-black tracking-[0.2em] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="w-full">
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
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="h-[46px] text-xs font-black tracking-[0.2em]"
              />
            </div>

            {error && (
              <p className="text-[10px] font-black text-neo-red uppercase tracking-wider text-center">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="neo-yellow"
              size="xl"
              isLoading={isLoading}
              disabled={
                isLoading ||
                !username.trim() ||
                !password.trim() ||
                !confirmPassword.trim() ||
                isUsernameBlocking
              }
              className="w-full h-[52px] text-sm font-black uppercase italic font-headline tracking-tighter mt-2"
            >
              {isLoading
                ? t('signup.initiating')
                : t('googleSignup.createAccount')}
            </Button>
          </form>
        </AuthCard>
      </div>
    </div>
  );
}
