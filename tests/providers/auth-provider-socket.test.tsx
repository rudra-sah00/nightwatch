import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/use-auth-store';

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
let forceLogoutHandler:
  | ((payload: { reason: string; message: string }) => void)
  | null = null;

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ prefetchQuery: vi.fn(), clear: vi.fn() }),
}));

vi.mock('@/providers/socket-provider', () => ({
  useSocket: () => ({
    socket: { connected: true, on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    isConnected: true,
    connect: mockConnect,
    disconnect: mockDisconnect,
  }),
}));

vi.mock('@/lib/socket', () => ({
  onForceLogout: vi.fn((cb) => {
    forceLogoutHandler = cb;
  }),
  offForceLogout: vi.fn(),
}));

vi.mock('@/features/auth/api', () => ({
  logoutUser: vi.fn().mockResolvedValue(undefined),
  unregisterPushToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/profile/api', () => ({
  getProfile: vi.fn().mockResolvedValue({
    user: {
      id: 'user-1',
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
    },
  }),
}));

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn(() => null),
  storeUser: vi.fn(),
  clearStoredUser: vi.fn(),
}));

vi.mock('@/lib/fetch', () => ({
  setTokenExpiration: vi.fn(),
  getTokenExpiresAt: vi.fn(() => null),
  revalidateTokenOnResume: vi.fn(),
}));

vi.mock('@/lib/device-id', () => ({
  initDeviceInfo: vi.fn(),
  getDeviceId: () => 'test-device-id',
}));

vi.mock('@/features/music/store/use-music-store', () => ({
  useMusicStore: { getState: () => ({ reset: vi.fn() }) },
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/electron-bridge', () => ({
  checkIsDesktop: () => false,
  desktopBridge: { storeGet: vi.fn(), storeSet: vi.fn(), storeDelete: vi.fn() },
}));

import { onForceLogout } from '@/lib/socket';
import { AuthProvider } from '@/providers/auth-provider';

describe('AuthProvider socket event handling', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    forceLogoutHandler = null;
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: '/' },
      writable: true,
    });
    act(() => {
      useAuthStore.setState({
        user: {
          id: 'user-1',
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          profilePhoto: null,
          sessionId: 'session-1',
          createdAt: '2025-01-01T00:00:00Z',
          googleId: null,
          googleEmail: null,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('connects socket when user is authenticated', async () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith(
        'user-1',
        'session-1',
        'Test User',
        undefined,
      );
    });
  });

  it('registers force_logout handler on connect', async () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(onForceLogout).toHaveBeenCalled();
    });
  });

  it('force_logout clears user and disconnects socket', async () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(forceLogoutHandler).not.toBeNull();
    });

    act(() => {
      forceLogoutHandler?.({
        reason: 'new_login',
        message: 'Logged in elsewhere',
      });
    });

    expect(mockDisconnect).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('does not connect socket when no user', async () => {
    act(() => {
      useAuthStore.setState({ user: null, isAuthenticated: false });
    });

    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    // Wait a tick to ensure effects have run
    await waitFor(() => {
      expect(mockConnect).not.toHaveBeenCalled();
    });
  });
});
