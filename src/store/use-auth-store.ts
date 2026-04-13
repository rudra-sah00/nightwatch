import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginUser, logoutUser, registerUser } from '@/features/auth/api';
import type { LoginInput, RegisterInput } from '@/features/auth/schema';
import { clearStoredUser, storeUser } from '@/lib/auth';
import type { LoginResponse, User } from '@/types';

function clearCookiesAndRedirect(message?: string) {
  if (message) {
    try {
      sessionStorage.setItem('auth_flash', message);
    } catch {}
  }
  logoutUser({ skipRefresh: true } as RequestInit).catch(() => {});
  if (typeof window !== 'undefined') window.location.href = '/login';
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setIsLoading: (isLoading: boolean) => void;

  login: (data: LoginInput) => Promise<LoginResponse>;
  register: (data: RegisterInput) => Promise<LoginResponse>;
  verifyOtp: (
    email: string,
    otp: string,
    context: 'login' | 'register',
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
        }
        return response;
      },

      register: async (data: RegisterInput) => registerUser(data),

      verifyOtp: async (email, otp, context, mobileState) => {
        const { verifyOtp: apiVerifyOtp } = await import('@/features/auth/api');
        const response = await apiVerifyOtp(email, otp, context, mobileState);
        if (response.user) {
          storeUser(response.user);
          sessionStorage.removeItem('guest_token');
          sessionStorage.removeItem('guest_refresh_token');
          set({ user: response.user, isAuthenticated: true });
        }
        return response;
      },

      logout: async () => {
        try {
          await logoutUser();
        } catch {
        } finally {
          clearStoredUser();
          sessionStorage.removeItem('guest_token');
          sessionStorage.removeItem('guest_refresh_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
          clearCookiesAndRedirect();
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
      name: 'watch_rudra_auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export { clearCookiesAndRedirect };
