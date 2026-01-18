'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  login as apiLoginFn,
  logout as apiLogout,
  clearStoredUser,
  getCurrentUser,
  getStoredUser,
  setStoredUser,
  type User,
} from '@/services/api';

// Auth states following industry best practices (like Auth0, Clerk, NextAuth)
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Timeout for auth check - if backend doesn't respond, assume unauthenticated
const AUTH_CHECK_TIMEOUT = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start with null/loading - hydration safe
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isMounted, setIsMounted] = useState(false);

  // Handle force logout events from API client
  const handleForceLogout = useCallback(() => {
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // Listen for force logout events
  useEffect(() => {
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, [handleForceLogout]);

  // Main auth initialization effect
  useEffect(() => {
    setIsMounted(true);

    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      const storedUser = getStoredUser();

      // No stored user = definitely unauthenticated
      if (!storedUser) {
        setStatus('unauthenticated');
        return;
      }

      // Have stored user - verify with backend
      try {
        const timeoutPromise = new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Auth check timeout'));
          }, AUTH_CHECK_TIMEOUT);
        });

        const authPromise = getCurrentUser({ signal: controller.signal });
        const result = await Promise.race([authPromise, timeoutPromise]);

        clearTimeout(timeoutId);

        if (controller.signal.aborted) return;

        if (result && 'data' in result && result.data?.user) {
          // Backend confirmed auth is valid
          setUser(result.data.user);
          setStoredUser(result.data.user);
          setStatus('authenticated');
        } else {
          // Backend rejected - clear everything
          console.warn('Auth verification failed, clearing stored auth');
          clearStoredUser();
          setUser(null);
          setStatus('unauthenticated');
        }
      } catch (error) {
        // Timeout or network error - DON'T trust stale local data
        // This is the key fix: on error, we clear auth rather than trusting old data
        if (controller.signal.aborted) return;
        console.warn('Auth verification failed:', error);
        clearStoredUser();
        setUser(null);
        setStatus('unauthenticated');
      }
    };

    initAuth();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // Storage event listener for cross-tab sync
  useEffect(() => {
    if (!isMounted) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wr_user') {
        if (!e.newValue) {
          setUser(null);
          setStatus('unauthenticated');
        } else {
          try {
            const storedUser = JSON.parse(e.newValue);
            setUser(storedUser);
            setStatus('authenticated');
          } catch {
            setUser(null);
            setStatus('unauthenticated');
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isMounted]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiLoginFn(username, password);

    if (result.data) {
      setUser(result.data.user);
      setStatus('authenticated');
      return { success: true };
    }

    return { success: false, error: result.error || 'Login failed' };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const result = await getCurrentUser();
      if (result.data?.user) {
        setUser(result.data.user);
        setStoredUser(result.data.user);
        setStatus('authenticated');
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    clearStoredUser();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      isLoggedIn: status === 'authenticated',
      login,
      logout,
      refreshUser,
    }),
    [user, status, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
