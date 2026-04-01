import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextType } from '@/providers/auth-provider';

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

// Mock dynamic imports to exercise the loading logic
vi.mock('next/dynamic', () => ({
  default: (
    _loader: () => Promise<unknown>,
    opts?: { loading?: () => React.ReactNode },
  ) => {
    const DynamicStub = () => {
      // Call the loading function if it exists to get test coverage for those lines
      // In a real scenario, this would be rendered until the loader resolves.
      return (
        <div>
          {opts?.loading && (
            <div data-testid="dynamic-loading">{opts.loading()}</div>
          )}
          <div data-testid="dynamic-stub" />
        </div>
      );
    };
    DynamicStub.displayName = 'DynamicStub';
    return DynamicStub;
  },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders correctly', async () => {
    const { default: LoginPage } = await import('@/app/(public)/login/page');
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', { name: /solo viewing/i }),
    ).toBeInTheDocument();
  });

  it('shows flash message from sessionStorage and clears it', async () => {
    sessionStorage.setItem(
      'auth_flash',
      'You have been logged out from another device.',
    );

    const { default: LoginPage } = await import('@/app/(public)/login/page');

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'You have been logged out from another device.',
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
        preferredServer: 's1' as 's1' | 's2',
        sessionId: 's1',
        createdAt: '2025-01-01',
      },
      login: vi.fn(),
      register: vi.fn(),
      verifyOtp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      resendOtp: vi.fn(),
      resendCooldown: 0,
    } as unknown as AuthContextType);

    const { default: LoginPage } = await import('@/app/(public)/login/page');

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/home');
    });
  });

  it('shows loading spinner while auth is loading', async () => {
    const { useAuth } = await import('@/providers/auth-provider');
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    } as unknown as AuthContextType);

    const { default: LoginPage } = await import('@/app/(public)/login/page');

    const { container } = render(<LoginPage />);

    expect(screen.queryByText('Welcome Back')).toBeNull();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
