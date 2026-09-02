'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  clearPendingGoogleSignup,
  type GoogleProfileRequired,
  getGoogleOAuthUrl,
  googleComplete,
  googleContinue,
  isProfileRequired,
  nativeGoogleSignIn,
  readPendingGoogleSignup,
  storePendingGoogleSignup,
} from '@/features/auth/google-api';
import { trackEvent } from '@/lib/analytics';
import { storeUser } from '@/lib/auth';
import { checkIsMobile } from '@/lib/electron-bridge';
import { setTokenExpiration } from '@/lib/fetch';
import { useAuthStore } from '@/store/use-auth-store';
import type { ApiError, LoginResponse } from '@/types';

/** Values collected by the profile step. */
export interface GoogleProfileValues {
  username: string;
  name: string;
  password: string;
}

/**
 * Drives "Continue with Google" — the single entry point for both signing in
 * and signing up.
 *
 * `start` runs the Google handshake. If the account already exists the user is
 * signed in and sent to /home. If it does not, `pending` is populated with the
 * verified Google profile and a signup ticket, and the caller renders the
 * profile step and finishes with `complete`.
 *
 * A pending signup is mirrored into sessionStorage because the web flow leaves
 * the page: Google redirects to `/auth/google/callback`, which resolves the
 * profile and hands back here. Native never leaves the page but takes the same
 * path so there is only one code path to reason about.
 */
export function useGoogleAuth() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [pending, setPending] = useState<GoogleProfileRequired | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Pick up a signup parked by the OAuth callback before it redirected here.
  useEffect(() => {
    const parked = readPendingGoogleSignup();
    if (parked) {
      setPending(parked);
    }
  }, []);

  const applySession = useCallback((response: LoginResponse) => {
    if (!response.user) {
      return;
    }
    storeUser(response.user);
    useAuthStore.getState().setUser(response.user);
    if (response.expiresIn) {
      setTokenExpiration(response.expiresIn);
    }
  }, []);

  const goHome = useCallback(() => {
    if (checkIsMobile()) {
      window.location.href = '/home?tour=true';
    } else {
      router.replace('/home');
    }
  }, [router]);

  /**
   * Opens the Google handshake. Native uses the device account picker; web and
   * Electron redirect to Google and resume in the OAuth callback page.
   */
  const start = useCallback(async () => {
    if (!window.Capacitor?.isNativePlatform?.()) {
      window.location.href = getGoogleOAuthUrl('login');
      return;
    }

    setIsStarting(true);
    try {
      const idToken = await nativeGoogleSignIn();
      const response = await googleContinue({ idToken });

      if (isProfileRequired(response)) {
        storePendingGoogleSignup(response);
        setPending(response);
        return;
      }

      trackEvent('login_success', { method: 'google' });
      applySession(response);
      goHome();
    } catch (err: unknown) {
      const apiError = err as ApiError;
      toast.error(apiError?.message || t('errors.googleSignInFailed'));
    } finally {
      setIsStarting(false);
    }
  }, [applySession, goHome, t]);

  /**
   * Creates the account from the pending ticket plus the chosen username, name,
   * and password.
   *
   * A taken username is surfaced against the username field and the ticket is
   * kept, so the user picks another name without redoing the Google step. An
   * expired ticket is unrecoverable, so the flow resets to the start.
   */
  const complete = useCallback(
    async (values: GoogleProfileValues) => {
      if (!pending) {
        return;
      }

      setIsCompleting(true);
      setUsernameError(null);
      try {
        const response = await googleComplete({
          ticket: pending.ticket,
          ...values,
        });

        trackEvent('signup_success', { method: 'google' });
        clearPendingGoogleSignup();
        setPending(null);
        applySession(response);
        goHome();
      } catch (err: unknown) {
        const apiError = err as ApiError;

        if (apiError?.code === 'USERNAME_TAKEN') {
          setUsernameError(t('googleSignup.usernameTaken'));
          return;
        }

        if (apiError?.code === 'GOOGLE_TICKET_INVALID') {
          clearPendingGoogleSignup();
          setPending(null);
          toast.error(t('errors.googleAuthExpired'));
          return;
        }

        toast.error(apiError?.message || t('errors.registrationFailed'));
      } finally {
        setIsCompleting(false);
      }
    },
    [applySession, goHome, pending, t],
  );

  /** Abandons a pending signup and returns to the login form. */
  const cancel = useCallback(() => {
    clearPendingGoogleSignup();
    setPending(null);
    setUsernameError(null);
  }, []);

  return {
    pending,
    isStarting,
    isCompleting,
    usernameError,
    clearUsernameError: () => setUsernameError(null),
    start,
    complete,
    cancel,
  };
}
