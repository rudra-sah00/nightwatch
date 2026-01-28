'use client';

import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  type LoginInput,
  loginUser,
  logoutUser,
  type RegisterInput,
  registerUser,
} from '@/features/auth';
import { getProfile, invalidateProfileCache } from '@/features/profile/api';
import { clearStoredUser, getStoredUser, storeUser } from '@/lib/auth';
import { setTokenExpiration } from '@/lib/fetch';
import {
  disconnectSocket,
  initSocket,
  offForceLogout,
  onForceLogout,
} from '@/lib/ws';
import type { ForceLogoutPayload, LoginResponse, User } from '@/types';

interface AuthContextType {
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
  const forceLogoutHandlerRef = useRef<
    ((payload: ForceLogoutPayload) => void) | null
  >(null);

  // Handle force logout from WebSocket
  const handleForceLogout = useCallback((payload: ForceLogoutPayload) => {
    toast.error(payload.message || 'You have been logged out');
    clearStoredUser();
    disconnectSocket();
    setUser(null);
  }, []);

  // Initialize from localStorage on mount
  useEffect(() => {
    const controller = new AbortController();

    const initAuth = async () => {
      const storedUser = getStoredUser();
      if (storedUser) {
        if (controller.signal.aborted) return;
        setUser(storedUser);

        // Connect WebSocket with stored credentials
        initSocket(storedUser.id, storedUser.sessionId);
        forceLogoutHandlerRef.current = handleForceLogout;
        onForceLogout(handleForceLogout);

        // Initialize proactive token refresh (15 minutes)
        setTokenExpiration(15 * 60);

        // Fetch latest profile to get missing fields like createdAt
        try {
          // Invalidate cache to ensure fresh data
          invalidateProfileCache();
          const { user: profileData } = await getProfile({
            signal: controller.signal,
          });
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
            toast.error('Session expired. Please login again.');

            clearStoredUser();
            disconnectSocket();
            if (!controller.signal.aborted) {
              setUser(null);
            }
          }
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
      disconnectSocket();
    };
  }, [handleForceLogout]);

  const onLoginSuccess = useCallback(
    (loggedInUser: User) => {
      storeUser(loggedInUser);
      setUser(loggedInUser);
      initSocket(loggedInUser.id, loggedInUser.sessionId);
      forceLogoutHandlerRef.current = handleForceLogout;
      onForceLogout(handleForceLogout);
      sessionStorage.removeItem('guest_token');
      sessionStorage.removeItem('guest_refresh_token');
    },
    [handleForceLogout],
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
      const { verifyOtp: apiVerifyOtp } = await import('@/features/auth');
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
      // Silent fail
    } finally {
      clearStoredUser();
      disconnectSocket();
      setUser(null);
      sessionStorage.removeItem('guest_token');
      sessionStorage.removeItem('guest_refresh_token');
    }
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      storeUser(updated);
      return updated;
    });
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    const { resendOtp: apiResend } = await import('@/features/auth');
    await apiResend(email);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    verifyOtp,
    logout,
    updateUser,
    resendOtp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
