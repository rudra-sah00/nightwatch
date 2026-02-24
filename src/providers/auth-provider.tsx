'use client';

import type React from 'react';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { loginUser, logoutUser, registerUser } from '@/features/auth/api';
import type { LoginInput, RegisterInput } from '@/features/auth/schema';
import { getProfile, invalidateProfileCache } from '@/features/profile/api';
import { clearStoredUser, getStoredUser, storeUser } from '@/lib/auth';
import { setTokenExpiration } from '@/lib/fetch';
import { offForceLogout, onForceLogout } from '@/lib/socket';
import { useSocket } from '@/providers/socket-provider';
import type { ForceLogoutPayload, LoginResponse, User } from '@/types';

/**
 * Clear HTTP-only cookies by hitting the backend logout endpoint (fire-and-forget),
 * then hard-redirect to /login so SSR ProtectedLayout won't let the user through.
 */
function clearCookiesAndRedirect(message?: string) {
  // Persist a flash message so the login page can show it after redirect
  if (message) {
    try {
      sessionStorage.setItem('auth_flash', message);
    } catch {
      // Storage might be unavailable
    }
  }

  // Fire-and-forget: ask the backend to clear httpOnly cookies
  logoutUser({
    skipRefresh: true,
  } as RequestInit).catch(() => {
    // Session may already be invalidated — ignore
  });

  // Hard redirect — wipes all React state and forces SSR cookie check
  window.location.href = '/login';
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<LoginResponse>;
  register: (data: RegisterInput) => Promise<LoginResponse>;
  verifyOtp: (
    email: string,
    otp: string,
    context: 'login' | 'register',
  ) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  resendOtp: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { connect, disconnect } = useSocket();
  const forceLogoutHandlerRef = useRef<
    ((payload: ForceLogoutPayload) => void) | null
  >(null);

  // Handle force logout from Socket.IO — must redirect immediately
  const handleForceLogout = useCallback(
    (payload: ForceLogoutPayload) => {
      clearStoredUser();
      disconnect();
      setUser(null);
      clearCookiesAndRedirect(
        payload.message || 'You have been logged out from another device.',
      );
    },
    [disconnect],
  );

  // Initialize from localStorage on mount
  useEffect(() => {
    const controller = new AbortController();

    const initAuth = async () => {
      const storedUser = getStoredUser();
      if (storedUser) {
        if (controller.signal.aborted) return;
        setUser(storedUser);

        // Connect Socket.IO with stored credentials
        connect(
          storedUser.id,
          storedUser.sessionId,
          storedUser.name,
          storedUser.profilePhoto ?? undefined,
        );
        forceLogoutHandlerRef.current = handleForceLogout;
        onForceLogout(handleForceLogout);

        // Initialize security and profile in parallel
        try {
          // Invalidate cache to ensure fresh data
          invalidateProfileCache();

          const [{ user: profileData }] = await Promise.all([
            getProfile({ signal: controller.signal }),
            // Initialize proactive token refresh (15 minutes) - moved into parallel block
            Promise.resolve(setTokenExpiration(15 * 60)),
          ]);

          if (!controller.signal.aborted) {
            const updatedUser = { ...storedUser, ...profileData };
            setUser(updatedUser);
            storeUser(updatedUser);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;

          const err = error as { status?: number };
          // If Unauthorized (401) or User not found (404), logout immediately
          // This happens if the session was cleared in Redis or user deleted
          if (err.status === 401 || err.status === 404) {
            clearStoredUser();
            disconnect();
            if (!controller.signal.aborted) {
              setUser(null);
            }
            clearCookiesAndRedirect('Session expired. Please login again.');
            return;
          }
        }
      } else {
        // Prime CSRF cookie for anonymous users
        try {
          const { getPlatformStats } = await import('@/features/auth/api');
          await getPlatformStats();
        } catch {
          // Silent fail - stats banner and future POSTs handle missing cookie
        }
      }
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      controller.abort();
      if (forceLogoutHandlerRef.current) {
        offForceLogout(forceLogoutHandlerRef.current);
      }
      disconnect();
    };
  }, [handleForceLogout, connect, disconnect]);

  const onLoginSuccess = useCallback(
    (loggedInUser: User) => {
      storeUser(loggedInUser);
      setUser(loggedInUser);
      connect(
        loggedInUser.id,
        loggedInUser.sessionId,
        loggedInUser.name,
        loggedInUser.profilePhoto ?? undefined,
      );
      forceLogoutHandlerRef.current = handleForceLogout;
      onForceLogout(handleForceLogout);
      sessionStorage.removeItem('guest_token');
      sessionStorage.removeItem('guest_refresh_token');
    },
    [handleForceLogout, connect],
  );

  const login = useCallback(
    async (data: LoginInput) => {
      const response = await loginUser(data);

      // If requires OTP, we don't set user yet
      if (response.requiresOtp) {
        return response;
      }

      if (response.user) {
        onLoginSuccess(response.user);
      }
      return response;
    },
    [onLoginSuccess],
  );

  const register = useCallback(async (data: RegisterInput) => {
    const response = await registerUser(data);
    // Usually requires OTP now, so we just return response
    return response;
  }, []);

  const verifyOtp = useCallback(
    async (email: string, otp: string, context: 'login' | 'register') => {
      // Import strictly to avoid circular deps if any, though imports up top are fine
      const { verifyOtp: apiVerifyOtp } = await import('@/features/auth/api');
      const response = await apiVerifyOtp(email, otp, context);

      if (response.user) {
        onLoginSuccess(response.user);
      }
      return response;
    },
    [onLoginSuccess],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Silent fail — backend may already have cleared the session
    } finally {
      clearStoredUser();
      disconnect();
      setUser(null);
      sessionStorage.removeItem('guest_token');
      sessionStorage.removeItem('guest_refresh_token');
      // Hard redirect ensures cookies are cleared and SSR check fires
      clearCookiesAndRedirect();
    }
  }, [disconnect]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;

      // Shallow equality check to prevent redundant re-renders
      const hasChanges = Object.entries(data).some(
        ([key, value]) => prev[key as keyof User] !== value,
      );

      if (!hasChanges) return prev;

      const updated = { ...prev, ...data };
      storeUser(updated);
      return updated;
    });
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    const { resendOtp: apiResend } = await import('@/features/auth/api');
    await apiResend(email);
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      verifyOtp,
      logout,
      updateUser,
      resendOtp,
    }),
    [
      user,
      isLoading,
      login,
      register,
      verifyOtp,
      logout,
      updateUser,
      resendOtp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
