'use client';

import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { getProfile, invalidateProfileCache } from '@/features/profile/api';
import { setTokenExpiration } from '@/lib/fetch';
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

  const { connect, disconnect } = useSocket();
  const forceLogoutHandlerRef = useRef<
    ((payload: ForceLogoutPayload) => void) | null
  >(null);

  const handleForceLogout = useCallback(
    (payload: ForceLogoutPayload) => {
      disconnect();
      setUser(null);
      clearCookiesAndRedirect(
        payload.message || 'You have been logged out from another device.',
      );
    },
    [disconnect, setUser],
  );

  const handleAuthExpired = useCallback(() => {
    disconnect();
    setUser(null);
    clearCookiesAndRedirect('Session expired. Please login again.');
  }, [disconnect, setUser]);

  useEffect(() => {
    window.addEventListener('auth:expired', handleAuthExpired);
    const controller = new AbortController();

    const initAuth = async () => {
      if (user) {
        // Hydrated from Zustand persist
        setIsLoading(false);

        // Connect Socket.IO
        connect(
          user.id,
          user.sessionId,
          user.name,
          user.profilePhoto ?? undefined,
        );
        forceLogoutHandlerRef.current = handleForceLogout;
        onForceLogout(handleForceLogout);

        try {
          invalidateProfileCache();
          const [{ user: profileData }] = await Promise.all([
            getProfile({ signal: controller.signal }),
            Promise.resolve(setTokenExpiration(15 * 60)),
          ]);

          if (!controller.signal.aborted) {
            useAuthStore.getState().updateUser(profileData);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
          const err = error as { status?: number };
          if (err.status === 401 || err.status === 404) {
            disconnect();
            if (!controller.signal.aborted) {
              setUser(null);
              setIsLoading(false);
            }
            clearCookiesAndRedirect('Session expired. Please login again.');
          }
        }
      } else {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    // Small delay to let Zustand hydrate on mount
    setTimeout(() => initAuth(), 0);

    return () => {
      controller.abort();
      if (forceLogoutHandlerRef.current)
        offForceLogout(forceLogoutHandlerRef.current);
      disconnect();
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [
    user,
    handleForceLogout,
    handleAuthExpired,
    connect,
    disconnect,
    setUser,
    setIsLoading,
  ]);

  return <>{children}</>;
}

// 1:1 drop-in replacement hook for the rest of the application
export const useAuth = useAuthStore;
