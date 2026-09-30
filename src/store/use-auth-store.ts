import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import { loginUser, logoutUser } from '@/features/auth/api';
import type { LoginInput } from '@/features/auth/schema';
import { trackEvent } from '@/lib/analytics';
import { clearStoredUser, storeUser } from '@/lib/auth';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { setDeliberateLogout, setTokenExpiration } from '@/lib/fetch';
import type { LoginResponse, User } from '@/types';

// Persistent Native Caching Wrapper that automatically synchronizes the user's
// Auth Tokens and preferences natively to their hard drive via desktopBridge.
const customNativeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (checkIsDesktop()) {
      try {
        const val = await desktopBridge.storeGet(name);
        if (val) return JSON.stringify(val);
      } catch {
        // Fallback
      }
    }
    return localStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (checkIsDesktop()) {
      try {
        await desktopBridge.storeSet(name, JSON.parse(value));
      } catch {}
    }
    localStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (checkIsDesktop()) {
      try {
        await desktopBridge.storeDelete(name);
      } catch {}
    }
    localStorage.removeItem(name);
  },
};

import type { QueryClient } from '@tanstack/react-query';
import { useMusicStore } from '@/features/music/store/use-music-store';

// Singleton reference to clear query cache on logout
let _queryClient: QueryClient | null = null;
export function setQueryClientRef(qc: QueryClient) {
  _queryClient = qc;
}

/**
 * One-shot message shown on `/continue` after an auth redirect.
 *
 * `key` is a `common` translation key, resolved on the login screen — the store
 * has no translator. `text` carries an already-localised string (e.g. a reason
 * sent by the server with a force-logout).
 */
export interface AuthFlash {
  key?: string;
  text?: string;
  level?: 'error' | 'success';
}

export const AUTH_FLASH_KEY = 'auth_flash';

/** Login route signed-out users land on. Mirrors `LOGIN_PATH` in `proxy.ts`. */
const LOGIN_PATH = '/continue';

/**
 * How long to wait for the backend to clear the session cookie before
 * redirecting anyway. Long enough for a normal round trip, short enough that an
 * offline or hung request still lets the user go.
 */
const LOGOUT_WAIT_MS = 2000;

function clearCookiesAndRedirect(flash?: string | AuthFlash) {
  if (flash) {
    try {
      const payload: AuthFlash =
        typeof flash === 'string' ? { text: flash, level: 'error' } : flash;
      sessionStorage.setItem(AUTH_FLASH_KEY, JSON.stringify(payload));
    } catch {}
  }
  _queryClient?.clear();
  useMusicStore.getState().reset();
  // Synchronously clear persisted auth state BEFORE the hard redirect.
  // The Zustand persist middleware writes asynchronously (customNativeStorage),
  // so setUser(null) may not flush to localStorage before navigation.
  try {
    localStorage.removeItem('nightwatch_auth');
  } catch {}
  clearStoredUser();
  sessionStorage.removeItem('guest_token');
  sessionStorage.removeItem('guest_refresh_token');

  // `refreshToken` is HttpOnly, so only the backend can clear it, and the proxy
  // guard keys off exactly that cookie. Navigating before the logout response
  // lands leaves the cookie in place, and the guard then bounces /continue
  // straight back to /home — the user cannot reach the login page at all.
  // A hard navigation can abort an in-flight request, so wait for logout before
  // leaving, but cap the wait so a hung or offline request cannot trap anyone.
  // `signedOut` tells the guard to render the login page even if the cookie did
  // outlive this call, which keeps a failed clear from becoming a redirect loop.
  const leave = () => {
    if (typeof window !== 'undefined') {
      window.location.href = `${LOGIN_PATH}?signedOut=1`;
    }
  };
  const loggedOut = logoutUser({ skipRefresh: true } as RequestInit).catch(
    () => {},
  );
  const deadline = new Promise((resolve) =>
    setTimeout(resolve, LOGOUT_WAIT_MS),
  );
  void Promise.race([loggedOut, deadline]).then(leave, leave);
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setIsLoading: (isLoading: boolean) => void;

  login: (data: LoginInput) => Promise<LoginResponse>;
  verifyOtp: (
    email: string,
    otp: string,
    context: 'login',
    mobileState?: string,
  ) => Promise<LoginResponse>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setIsLoading: (isLoading) => set({ isLoading }),

      login: async (data: LoginInput) => {
        const response = await loginUser(data);
        if (response.requiresOtp) return response;
        if (response.user) {
          storeUser(response.user); // Keep legacy storage in-sync just in case
          sessionStorage.removeItem('guest_token');
          sessionStorage.removeItem('guest_refresh_token');
          set({ user: response.user, isAuthenticated: true });
          trackEvent('login_success', { method: 'email' });
        }
        return response;
      },

      verifyOtp: async (email, otp, context, mobileState) => {
        const { verifyOtp: apiVerifyOtp } = await import('@/features/auth/api');
        const response = await apiVerifyOtp(email, otp, context, mobileState);
        if (response.user) {
          storeUser(response.user);
          sessionStorage.removeItem('guest_token');
          sessionStorage.removeItem('guest_refresh_token');
          // Arm the proactive refresh timer to the exact token lifetime returned
          // by the server so we refresh 1 minute early, not from page-load time.
          if (response.expiresIn) {
            setTokenExpiration(response.expiresIn);
          }
          set({ user: response.user, isAuthenticated: true });
          trackEvent('login_success', { method: 'otp' });
        }
        return response;
      },

      logout: async () => {
        trackEvent('logout');
        // Mark this as intentional before firing anything that can 401. Both
        // the unregister below and POST /auth/logout run against a session
        // being torn down, and would otherwise be reported to the user as
        // "Session expired. Please login again."
        setDeliberateLogout(true);

        // Unregister push notification token before logging out
        try {
          const { getDeviceId } = await import('@/lib/device-id');
          const { unregisterPushToken } = await import('@/features/auth/api');
          await unregisterPushToken(getDeviceId());
        } catch {}

        try {
          await logoutUser();
        } catch {
        } finally {
          clearStoredUser();
          sessionStorage.removeItem('guest_token');
          sessionStorage.removeItem('guest_refresh_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
          clearCookiesAndRedirect({
            key: 'toasts.signedOut',
            level: 'success',
          });
        }
      },

      updateUser: (data) => {
        const prev = get().user;
        if (!prev) return;
        const hasChanges = Object.entries(data).some(
          ([key, value]) => prev[key as keyof User] !== value,
        );
        if (!hasChanges) return;
        const updated = { ...prev, ...data };
        storeUser(updated);
        set({ user: updated, isAuthenticated: true });
      },

      resendOtp: async (email) => {
        const { resendOtp: apiResend } = await import('@/features/auth/api');
        await apiResend(email);
      },
    }),
    {
      name: 'nightwatch_auth',
      storage: createJSONStorage(() => customNativeStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Called after hydration completes — isLoading can now safely be false
        state?.setIsLoading(false);
      },
    },
  ),
);

export { clearCookiesAndRedirect };
