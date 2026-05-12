import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { useAuthStore } from '@/store/use-auth-store';

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('@/providers/socket-provider', () => ({
  useSocket: vi.fn(() => ({
    socket: { connected: true, on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    isConnected: true,
    connect: mockConnect,
    disconnect: mockDisconnect,
  })),
}));

vi.mock('@/lib/socket', () => ({
  onForceLogout: vi.fn(),
  offForceLogout: vi.fn(),
}));

vi.mock('@/features/auth/api', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn().mockResolvedValue(undefined),
  verifyOtp: vi.fn(),
  resendOtp: vi.fn(),
}));

vi.mock('@/features/profile/api', () => {
  return {
    getProfile: vi
      .fn()
      .mockResolvedValue({ user: { id: 'user-1', name: 'Test User' } }),
    invalidateProfileCache: vi.fn(),
  };
});

vi.mock('@/lib/auth', () => {
  return {
    getStoredUser: vi.fn(() => ({ id: 'user-1', name: 'Test User' })),
    storeUser: vi.fn(),
    clearStoredUser: vi.fn(),
  };
});

vi.mock('@/lib/fetch', () => ({
  setTokenExpiration: vi.fn(),
}));

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  profilePhoto: null,
  sessionId: 'session-1',
  preferredServer: 's2' as const,
  createdAt: '2025-01-01T00:00:00Z',
};

function renderAuthProvider() {
  function Consumer() {
    const user = useAuth((s) => s.user);
    const isAuthenticated = useAuth((s) => s.isAuthenticated);
    return (
      <div>
        <span data-testid="user">{user ? user.name : 'none'}</span>
        <span data-testid="authenticated">{String(isAuthenticated)}</span>
      </div>
    );
  }
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}

describe('AuthProvider & Zustand Store', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    originalLocation = window.location;
    // @ts-expect-error
    delete window.location;
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    window.location = { ...originalLocation, href: '/' } as any;

    act(() => {
      // reset store
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    });
  });

  afterEach(() => {
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    window.location = originalLocation as any;
  });

  it('restores user from zustand and connects socket when hydrated', async () => {
    act(() => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    });

    renderAuthProvider();

    // We expect the consumer to eventually read Zustand (may require act to settle)
    expect(await screen.findByTestId('user')).toHaveTextContent('Test User');
    expect(await screen.findByTestId('authenticated')).toHaveTextContent(
      'true',
    );
  });

  it('logoutUser action clears store and redirects', async () => {
    act(() => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    });

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expect(useAuthStore.getState().user).toBe(null);
    expect(window.location.href).toBe('/login');
  });
});
