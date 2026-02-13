import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/login',
  }),
  useSearchParams: () => ({ get: vi.fn() }),
  usePathname: () => '/login',
}));

const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/providers/auth-provider', () => import('./__mocks__/auth-provider'));

// Mock dynamic imports so login page renders without loading actual form components
vi.mock('next/dynamic', () => ({
  default: (
    _loader: () => Promise<unknown>,
    _opts?: Record<string, unknown>,
  ) => {
    // Return a simple placeholder component
    const Component = (_props: Record<string, unknown>) => (
      <div data-testid="dynamic-stub" />
    );
    Component.displayName = 'DynamicStub';
    return Component;
  },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('LoginPage flash message', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows flash message from sessionStorage and clears it', async () => {
    sessionStorage.setItem(
      'auth_flash',
      'You have been logged out from another device.',
    );

    // Dynamic import to get the default export
    const { default: LoginPage } = await import('@/app/(public)/login/page');

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'You have been logged out from another device.',
      );
    });

    // Flash should be consumed (removed)
    expect(sessionStorage.getItem('auth_flash')).toBeNull();
  });

  it('does NOT show toast when no flash message exists', async () => {
    const { default: LoginPage } = await import('@/app/(public)/login/page');

    render(<LoginPage />);

    // Give effects time to run
    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('shows session-expired flash message', async () => {
    sessionStorage.setItem(
      'auth_flash',
      'Session expired. Please login again.',
    );

    const { default: LoginPage } = await import('@/app/(public)/login/page');

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Session expired. Please login again.',
      );
    });

    expect(sessionStorage.getItem('auth_flash')).toBeNull();
  });

  it('redirects to / when already authenticated', async () => {
    const { useAuth } = await import('@/providers/auth-provider');
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '1',
        name: 'Test',
        username: 'test',
        email: 'test@test.com',
        profilePhoto: null,
        sessionId: 's1',
        createdAt: '2025-01-01',
      },
      login: vi.fn(),
      register: vi.fn(),
      verifyOtp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      resendOtp: vi.fn(),
    });

    const { default: LoginPage } = await import('@/app/(public)/login/page');

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('shows loading spinner while auth is loading', async () => {
    const { useAuth } = await import('@/providers/auth-provider');
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      verifyOtp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      resendOtp: vi.fn(),
    });

    const { default: LoginPage } = await import('@/app/(public)/login/page');

    const { container } = render(<LoginPage />);

    // Should show spinner, not the "Welcome Back" heading
    expect(screen.queryByText('Welcome Back')).toBeNull();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
