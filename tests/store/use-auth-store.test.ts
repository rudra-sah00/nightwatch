import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  storeUser: vi.fn(),
  clearStoredUser: vi.fn(),
  getStoredUser: vi.fn(() => null),
}));

vi.mock('@/lib/electron-bridge', () => ({
  checkIsDesktop: () => false,
  desktopBridge: {
    storeGet: vi.fn(),
    storeSet: vi.fn(),
    storeDelete: vi.fn(),
  },
}));

vi.mock('@/lib/fetch', () => ({
  setTokenExpiration: vi.fn(),
}));

vi.mock('@/features/music/store/use-music-store', () => ({
  useMusicStore: { getState: () => ({ reset: vi.fn() }) },
}));

vi.mock('@/features/auth/api', () => ({
  loginUser: vi.fn(),
  logoutUser: vi.fn().mockResolvedValue(undefined),
  registerUser: vi.fn(),
  verifyOtp: vi.fn(),
  resendOtp: vi.fn(),
  unregisterPushToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/device-id', () => ({
  getDeviceId: () => 'test-device-id',
}));

import { loginUser, registerUser, verifyOtp } from '@/features/auth/api';
import { storeUser } from '@/lib/auth';
import { setTokenExpiration } from '@/lib/fetch';
import { useAuthStore } from '@/store/use-auth-store';
import type { LoginResponse, User } from '@/types';

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  profilePhoto: null,
  sessionId: 'session-1',
  createdAt: '2025-01-01T00:00:00Z',
  googleId: null,
  googleEmail: null,
};

describe('useAuthStore actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    });
  });

  describe('login', () => {
    it('sets user state on successful login without OTP', async () => {
      const response: LoginResponse = { user: mockUser };
      vi.mocked(loginUser).mockResolvedValue(response);

      const result = await useAuthStore.getState().login({
        email: 'test@example.com',
        password: 'pass123',
      });

      expect(result).toEqual(response);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(storeUser).toHaveBeenCalledWith(mockUser);
    });

    it('returns response without setting user when OTP required', async () => {
      const response: LoginResponse = {
        requiresOtp: true,
        email: 'test@example.com',
      };
      vi.mocked(loginUser).mockResolvedValue(response);

      const result = await useAuthStore.getState().login({
        email: 'test@example.com',
        password: 'pass123',
      });

      expect(result).toEqual(response);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('verifyOtp', () => {
    it('sets user and arms token refresh on success', async () => {
      const response: LoginResponse = { user: mockUser, expiresIn: 900 };
      vi.mocked(verifyOtp).mockResolvedValue(response);

      const result = await useAuthStore
        .getState()
        .verifyOtp('test@example.com', '123456', 'login');

      expect(result).toEqual(response);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(storeUser).toHaveBeenCalledWith(mockUser);
      expect(setTokenExpiration).toHaveBeenCalledWith(900);
    });

    it('passes mobile state to API', async () => {
      const response: LoginResponse = {
        user: mockUser,
        mobileAuthRedirectUrl: 'nightwatch://auth',
      };
      vi.mocked(verifyOtp).mockResolvedValue(response);

      await useAuthStore
        .getState()
        .verifyOtp('test@example.com', '123456', 'login', 'mobile-state-token');

      expect(verifyOtp).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        'login',
        'mobile-state-token',
      );
    });
  });

  describe('register', () => {
    it('delegates to registerUser API', async () => {
      const response: LoginResponse = {
        requiresOtp: true,
        email: 'new@example.com',
      };
      vi.mocked(registerUser).mockResolvedValue(response);

      const result = await useAuthStore.getState().register({
        name: 'New User',
        username: 'newuser',
        email: 'new@example.com',
        password: 'Pass123!',
        inviteCode: 'INV1',
      });

      expect(result).toEqual(response);
      expect(registerUser).toHaveBeenCalledWith({
        name: 'New User',
        username: 'newuser',
        email: 'new@example.com',
        password: 'Pass123!',
        inviteCode: 'INV1',
      });
    });
  });

  describe('updateUser', () => {
    it('merges partial data into existing user', () => {
      act(() => {
        useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      });

      act(() => {
        useAuthStore.getState().updateUser({ name: 'Updated Name' });
      });

      expect(useAuthStore.getState().user?.name).toBe('Updated Name');
      expect(useAuthStore.getState().user?.email).toBe('test@example.com');
    });

    it('does nothing when no user is set', () => {
      act(() => {
        useAuthStore.getState().updateUser({ name: 'Updated Name' });
      });
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('skips update when no fields changed', () => {
      act(() => {
        useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      });

      const spy = vi.mocked(storeUser);
      spy.mockClear();

      act(() => {
        useAuthStore.getState().updateUser({ name: mockUser.name });
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('setUser', () => {
    it('sets authenticated when user is provided', () => {
      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('clears authenticated when user is null', () => {
      act(() => {
        useAuthStore.setState({ user: mockUser, isAuthenticated: true });
        useAuthStore.getState().setUser(null);
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
