'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { getProfile, invalidateProfileCache } from '@/features/profile/api';
import {
  getTokenExpiresAt,
  revalidateTokenOnResume,
  setTokenExpiration,
} from '@/lib/fetch';
import { offForceLogout, onForceLogout } from '@/lib/socket';
import { useSocket } from '@/providers/socket-provider';
import { clearCookiesAndRedirect, useAuthStore } from '@/store/use-auth-store';
import type { ForceLogoutPayload } from '@/types';

/**
 * Headless background component that syncs Zustand Auth state with WebSockets
 * and checks the session token securely.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setIsLoading = useAuthStore((s) => s.setIsLoading);
  const t = useTranslations('common.errors');

  const { connect, disconnect } = useSocket();
  const forceLogoutHandlerRef = useRef<
    ((payload: ForceLogoutPayload) => void) | null
  >(null);

  // Signal to Electron that the React app booted successfully.
  // This resets the crash counter in main.js so the app knows it's healthy.
  // Only fires once per session — subsequent navigations don't re-signal.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'electronAPI' in window) {
      if (!(window as unknown as Record<string, boolean>).__nw_ready) {
        (window as unknown as Record<string, boolean>).__nw_ready = true;
        (
          window as unknown as { electronAPI: { signalReady?: () => void } }
        ).electronAPI.signalReady?.();
      }
    }
  }, []);

  // Revalidate auth token when the page becomes visible again.
  // Covers laptop sleep, tab backgrounding, and Capacitor app resume —
  // JS timers freeze in all these cases so the proactive refresh never fires.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') revalidateTokenOnResume();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleForceLogout = useCallback(
    (payload: ForceLogoutPayload) => {
      disconnect();
      setUser(null);
      clearCookiesAndRedirect(payload.message || t('sessionExpired'));
    },
    [disconnect, setUser, t],
  );

  const handleAuthExpired = useCallback(() => {
    disconnect();
    setUser(null);
    clearCookiesAndRedirect(t('sessionExpired'));
  }, [disconnect, setUser, t]);

  // Effect 1: Socket connect/disconnect — only re-runs when the identity changes
  // (id or sessionId). Profile updates from getProfile() must NOT trigger this
  // effect, otherwise every profile sync causes a disconnect → reconnect cycle
  // which is the root cause of logout-on-deploy.
  const userId = user?.id;
  const sessionId = user?.sessionId;

  useEffect(() => {
    if (!userId || !sessionId) {
      setIsLoading(false);
      return;
    }

    const currentUser = useAuthStore.getState().user;
    connect(
      userId,
      sessionId,
      currentUser?.name,
      currentUser?.profilePhoto ?? undefined,
    );

    forceLogoutHandlerRef.current = handleForceLogout;
    onForceLogout(handleForceLogout);

    return () => {
      if (forceLogoutHandlerRef.current)
        offForceLogout(forceLogoutHandlerRef.current);
      disconnect();
    };
  }, [userId, sessionId, connect, disconnect, handleForceLogout, setIsLoading]);

  // Effect 2: Profile sync — runs once on mount (or when identity changes) to
  // fetch fresh profile data. Does NOT disconnect the socket on re-run.
  useEffect(() => {
    window.addEventListener('auth:expired', handleAuthExpired);

    if (!userId) {
      return () =>
        window.removeEventListener('auth:expired', handleAuthExpired);
    }

    const controller = new AbortController();

    const syncProfile = async () => {
      try {
        invalidateProfileCache();
        const { user: profileData } = await getProfile({
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          useAuthStore.getState().updateUser(profileData);
          setIsLoading(false);

          // Only arm the proactive refresh timer if it hasn't been set yet
          // (i.e., this is a page reload — the verifyOtp flow already arms it
          // on fresh logins via setTokenExpiration). Setting it unconditionally
          // would reset it to T+15min on every navigation, causing the timer
          // to fire AFTER the token has already expired on long sessions.
          if (!getTokenExpiresAt()) {
            setTokenExpiration(15 * 60);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        const err = error as { status?: number; code?: string };
        if (err.status === 401 || err.status === 404) {
          disconnect();
          if (!controller.signal.aborted) {
            setUser(null);
            setIsLoading(false);
          }
          // Only redirect if apiFetch didn't already fire auth:expired
          // (code === 'SESSION_EXPIRED' means apiFetch already handled it)
          if (err.code !== 'SESSION_EXPIRED') {
            clearCookiesAndRedirect(t('sessionExpired'));
          }
        } else {
          // Network error during deploy window — don't log out, just mark loaded
          if (!controller.signal.aborted) setIsLoading(false);
        }
      }
    };

    setTimeout(() => syncProfile(), 0);

    return () => {
      controller.abort();
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [userId, handleAuthExpired, disconnect, setUser, setIsLoading, t]);

  return <>{children}</>;
}

// 1:1 drop-in replacement hook for the rest of the application
export const useAuth = useAuthStore;
