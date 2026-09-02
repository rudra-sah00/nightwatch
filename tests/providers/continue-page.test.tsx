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
    pathname: '/continue',
  }),
  useSearchParams: () => ({ get: vi.fn() }),
  usePathname: () => '/continue',
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

// The real ContinuePage is an async Server Component with a 2.5s delay which
// the test environment cannot await. Mock it to render ContinueClient directly.
vi.mock('@/app/(public)/continue/page', async () => {
  const { default: ContinueClient } = await import(
    '@/app/(public)/continue/ContinueClient'
  );
  return { default: ContinueClient };
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ContinuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders correctly', async () => {
    const { default: ContinuePage } = await import(
      '@/app/(public)/continue/page'
    );
    render(<ContinuePage />);

    expect(
      screen.getByRole('heading', { name: /features\.solo\.title/i }),
    ).toBeInTheDocument();
  });

  it('shows flash message from sessionStorage and clears it', async () => {
    sessionStorage.setItem(
      'auth_flash',
      'You have been logged out from another device.',
    );

    const { default: ContinuePage } = await import(
      '@/app/(public)/continue/page'
    );

    render(<ContinuePage />);

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
    } as unknown);

    const { default: ContinuePage } = await import(
      '@/app/(public)/continue/page'
    );

    render(<ContinuePage />);

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
    } as unknown);

    const { default: ContinuePage } = await import(
      '@/app/(public)/continue/page'
    );

    const { container } = render(<ContinuePage />);

    expect(screen.queryByText('Welcome Back')).toBeNull();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
