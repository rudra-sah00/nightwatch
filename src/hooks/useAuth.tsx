'use client';

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import {
  login as apiLoginFn,
  logout as apiLogout,
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
  setStoredUser,
  type User,
} from '@/services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const checkAuth = async () => {
      if (isAuthenticated()) {
        // Optimistic: Load from storage first for speed
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }

        try {
          // SECURE: Always verify token with backend
          // If token is invalid (401), client.ts will auto-refresh or redirect
          const result = await getCurrentUser({ signal: controller.signal });

          if (controller.signal.aborted) return;

          if (result.data?.user) {
            setUser(result.data.user);
            setStoredUser(result.data.user);
          } else if (result.error) {
            // Token invalid and refresh failed - clear local state
            console.warn('Auth verification failed:', result.error);
            setUser(null);
          }
        } catch {
          // Start fresh if verification fails unexpectedly
          setUser(null);
        }
      } else {
        // No stored user - ensure state is clean
        setUser(null);
      }

      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for storage changes to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      // Watch for user info changes (tokens are in HttpOnly cookies, not localStorage)
      if (e.key === 'wr_user') {
        if (!e.newValue) {
          // User logged out in another tab
          setUser(null);
        } else {
          // User logged in in another tab - reload user data
          try {
            const storedUser = JSON.parse(e.newValue);
            setUser(storedUser);
          } catch {
            setUser(null);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      controller.abort();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (username: string, password: string) => {
    const result = await apiLoginFn(username, password);

    if (result.data) {
      setUser(result.data.user);
      return { success: true };
    }

    return { success: false, error: result.error || 'Login failed' };
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isLoggedIn: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
