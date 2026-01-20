'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type LoginInput, loginUser, logoutUser } from '@/features/auth';
import { getProfile } from '@/features/profile/api';
import { clearStoredUser, getStoredUser, storeUser } from '@/lib/auth';
import { disconnectSocket, initSocket, offForceLogout, onForceLogout } from '@/lib/ws';
import type { ForceLogoutPayload, User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  forceLogoutMessage: string | null;
  clearForceLogoutMessage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forceLogoutMessage, setForceLogoutMessage] = useState<string | null>(null);
  const forceLogoutHandlerRef = useRef<((payload: ForceLogoutPayload) => void) | null>(null);

  // Handle force logout from WebSocket
  const handleForceLogout = useCallback((payload: ForceLogoutPayload) => {
    toast.error(payload.message || 'You have been logged out');

    setForceLogoutMessage(payload.message);
    clearStoredUser();
    disconnectSocket();
    setUser(null);
  }, []);

  // Initialize from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        // Connect WebSocket with stored credentials
        initSocket(storedUser.id, storedUser.sessionId);
        forceLogoutHandlerRef.current = handleForceLogout;
        onForceLogout(handleForceLogout);

        // Fetch latest profile to get missing fields like createdAt
        try {
          const { user: profileData } = await getProfile();
          const updatedUser = { ...storedUser, ...profileData };
          setUser(updatedUser);
          storeUser(updatedUser);
        } catch (error) {
          const err = error as { status?: number };
          // If Unauthorized (401) or User not found (404), logout immediately
          // This happens if the session was cleared in Redis or user deleted
          if (err.status === 401 || err.status === 404) {
            toast.error('Session expired. Please login again.');

            clearStoredUser();
            disconnectSocket();
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();

    return () => {
      if (forceLogoutHandlerRef.current) {
        offForceLogout(forceLogoutHandlerRef.current);
      }
      disconnectSocket();
    };
  }, [handleForceLogout]);

  const login = useCallback(
    async (data: LoginInput) => {
      const response = await loginUser(data);
      const { user: loggedInUser } = response;

      // Store user
      storeUser(loggedInUser);
      setUser(loggedInUser);

      // Clear any previous force logout message
      setForceLogoutMessage(null);

      // Initialize WebSocket connection
      initSocket(loggedInUser.id, loggedInUser.sessionId);
      forceLogoutHandlerRef.current = handleForceLogout;
      onForceLogout(handleForceLogout);
    },
    [handleForceLogout],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      toast.error('Logout failed (local session cleared)');
    } finally {
      clearStoredUser();
      disconnectSocket();
      setUser(null);
    }
  }, []);

  const clearForceLogoutMessage = useCallback(() => {
    setForceLogoutMessage(null);
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      storeUser(updated);
      return updated;
    });
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    forceLogoutMessage,
    clearForceLogoutMessage,
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
