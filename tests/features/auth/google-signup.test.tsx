import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GoogleSignupPage from '@/app/(public)/signup/google/page';
import { GoogleSignUpButton } from '@/features/auth/components/google-sign-up-button';
import { GOOGLE_SIGNUP_ID_TOKEN_KEY } from '@/features/auth/google-api';

// ─── Mocks ──────────────────────────────────────────────────────────────────
// vi.mock factories are hoisted above the module scope, so every value they
// close over has to be created inside vi.hoisted().
const h = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  nativeGoogleSignIn: vi.fn(),
  googleRegister: vi.fn(),
  googleLogin: vi.fn(),
  checkIsMobile: vi.fn(() => false),
  setUser: vi.fn(),
  searchParams: { current: {} as Record<string, string | null> },
}));

const {
  push: mockPush,
  replace: mockReplace,
  toastError: mockToastError,
  nativeGoogleSignIn: mockNativeGoogleSignIn,
  googleRegister: mockGoogleRegister,
  googleLogin: mockGoogleLogin,
  checkIsMobile: mockCheckIsMobile,
  setUser: mockSetUser,
} = h;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: h.push,
    replace: h.replace,
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => h.searchParams.current[key] ?? null,
  }),
  usePathname: () => '/signup/google',
}));

vi.mock('sonner', () => ({
  toast: { error: h.toastError, success: h.toastSuccess, info: vi.fn() },
}));

vi.mock('@/features/auth/google-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/auth/google-api')>();
  return {
    ...actual,
    nativeGoogleSignIn: h.nativeGoogleSignIn,
    googleRegister: h.googleRegister,
    googleLogin: h.googleLogin,
    getGoogleOAuthUrl: (mode: string) => `https://accounts.google.com/${mode}`,
  };
});

vi.mock('@/lib/electron-bridge', () => ({
  checkIsMobile: h.checkIsMobile,
  checkIsDesktop: () => false,
}));

vi.mock('@/features/auth/api', () => ({
  checkUsername: vi.fn(() => Promise.resolve({ available: true })),
}));

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/auth', () => ({ storeUser: vi.fn() }));
vi.mock('@/lib/fetch', () => ({ setTokenExpiration: vi.fn() }));

vi.mock('@/store/use-auth-store', () => ({
  useAuthStore: { getState: () => ({ setUser: h.setUser }) },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_PASSWORD = 'Password1!';

async function fillForm(password = VALID_PASSWORD, confirm = password) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('signup.username'), 'newuser');
  await user.type(screen.getByLabelText('signup.password'), password);
  await user.type(screen.getByLabelText('signup.confirmPassword'), confirm);
  return user;
}

/**
 * Submit the completion form. happy-dom does not turn a submit-button click into
 * a form `submit` event, so dispatch it on the form element directly.
 */
function submitForm() {
  const form = screen.getByLabelText('signup.username').closest('form');
  if (!form) throw new Error('signup form not found');
  fireEvent.submit(form);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  h.searchParams.current = {};
  mockCheckIsMobile.mockReturnValue(false);
});

// ─── GoogleSignUpButton ─────────────────────────────────────────────────────

describe('GoogleSignUpButton', () => {
  it('redirects to the Google consent screen on web', async () => {
    const hrefSetter = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        get href() {
          return '';
        },
        set href(v: string) {
          hrefSetter(v);
        },
        origin: 'https://nightwatch.in',
      },
      writable: true,
    });

    render(<GoogleSignUpButton />);
    await userEvent.setup().click(screen.getByRole('button'));

    expect(hrefSetter).toHaveBeenCalledWith(
      'https://accounts.google.com/register',
    );
    expect(mockNativeGoogleSignIn).not.toHaveBeenCalled();
  });

  it('uses the native account picker and hands the idToken to /signup/google', async () => {
    mockCheckIsMobile.mockReturnValue(true);
    mockNativeGoogleSignIn.mockResolvedValue('native-id-token');

    render(<GoogleSignUpButton />);
    await userEvent.setup().click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/signup/google');
    });
    expect(sessionStorage.getItem(GOOGLE_SIGNUP_ID_TOKEN_KEY)).toBe(
      'native-id-token',
    );
  });

  it('surfaces an error and does not navigate when native sign-in fails', async () => {
    mockCheckIsMobile.mockReturnValue(true);
    mockNativeGoogleSignIn.mockRejectedValue(new Error('user cancelled'));

    render(<GoogleSignUpButton />);
    await userEvent.setup().click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('user cancelled');
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(GOOGLE_SIGNUP_ID_TOKEN_KEY)).toBeNull();
  });
});

// ─── /signup/google ─────────────────────────────────────────────────────────

describe('GoogleSignupPage credential resolution', () => {
  it('renders the form when an OAuth code is present', async () => {
    h.searchParams.current = { code: 'oauth-code' };
    render(<GoogleSignupPage />);

    expect(await screen.findByLabelText('signup.username')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders the form when only a native idToken is present', async () => {
    sessionStorage.setItem(GOOGLE_SIGNUP_ID_TOKEN_KEY, 'native-id-token');
    render(<GoogleSignupPage />);

    expect(await screen.findByLabelText('signup.username')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects back to /signup when there is no credential at all', async () => {
    render(<GoogleSignupPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/signup');
    });
    expect(mockToastError).toHaveBeenCalledWith('googleAuthExpired');
  });
});

describe('GoogleSignupPage password policy', () => {
  it.each([
    ['short', 'Pw1!', 'validation.passwordMinLength'],
    ['no lowercase', 'PASSWORD1!', 'validation.passwordLowercase'],
    ['no uppercase', 'password1!', 'validation.passwordUppercase'],
    ['no number', 'Password!', 'validation.passwordNumber'],
    ['no special character', 'Password12', 'validation.passwordSpecialChar'],
  ])(
    'rejects a password with %s before calling the API',
    async (_label, password, expectedKey) => {
      h.searchParams.current = { code: 'oauth-code' };
      render(<GoogleSignupPage />);
      await screen.findByLabelText('signup.username');

      await fillForm(password);
      submitForm();

      expect(await screen.findByText(expectedKey)).toBeInTheDocument();
      expect(mockGoogleRegister).not.toHaveBeenCalled();
    },
  );

  it('rejects mismatched confirmation', async () => {
    h.searchParams.current = { code: 'oauth-code' };
    render(<GoogleSignupPage />);
    await screen.findByLabelText('signup.username');

    await fillForm(VALID_PASSWORD, 'Different1!');
    submitForm();

    expect(await screen.findByText('passwordsMismatch')).toBeInTheDocument();
    expect(mockGoogleRegister).not.toHaveBeenCalled();
  });
});

describe('GoogleSignupPage submission', () => {
  const user = {
    id: 'u1',
    email: 'new@example.com',
    username: 'newuser',
    name: 'New User',
    profilePhoto: null,
    sessionId: 's1',
    createdAt: new Date().toISOString(),
  };

  it('registers with the OAuth code on web', async () => {
    h.searchParams.current = { code: 'oauth-code' };
    mockGoogleRegister.mockResolvedValue({ user, expiresIn: 900 });

    render(<GoogleSignupPage />);
    await screen.findByLabelText('signup.username');
    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(mockGoogleRegister).toHaveBeenCalledWith(
        { code: 'oauth-code' },
        { username: 'newuser', password: VALID_PASSWORD },
      );
    });
    expect(mockSetUser).toHaveBeenCalledWith(user);
    expect(mockReplace).toHaveBeenCalledWith('/home?tour=true');
  });

  it('registers with the native idToken and clears it afterwards', async () => {
    sessionStorage.setItem(GOOGLE_SIGNUP_ID_TOKEN_KEY, 'native-id-token');
    mockGoogleRegister.mockResolvedValue({ user, expiresIn: 900 });

    render(<GoogleSignupPage />);
    await screen.findByLabelText('signup.username');
    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(mockGoogleRegister).toHaveBeenCalledWith(
        { idToken: 'native-id-token' },
        { username: 'newuser', password: VALID_PASSWORD },
      );
    });
    expect(sessionStorage.getItem(GOOGLE_SIGNUP_ID_TOKEN_KEY)).toBeNull();
  });

  it('restarts signup when the Google credential is already spent', async () => {
    h.searchParams.current = { code: 'used-code' };
    mockGoogleRegister.mockRejectedValue({
      code: 'GOOGLE_AUTH_FAILED',
      message: 'Google authentication failed',
    });

    render(<GoogleSignupPage />);
    await screen.findByLabelText('signup.username');
    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/signup');
    });
    expect(mockToastError).toHaveBeenCalledWith('googleAuthExpired');
  });

  it('shows a recoverable error without redirecting for other failures', async () => {
    h.searchParams.current = { code: 'oauth-code' };
    mockGoogleRegister.mockRejectedValue({
      code: 'USERNAME_TAKEN',
      message: 'Username is already taken',
    });

    render(<GoogleSignupPage />);
    await screen.findByLabelText('signup.username');
    await fillForm();
    submitForm();

    expect(
      await screen.findByText('Username is already taken'),
    ).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalledWith('/signup');
  });
});

// An account that already exists is not a failure the user should have to
// interpret — signing them in is what they were trying to do.
describe('GoogleSignupPage when the account already exists', () => {
  const existingUser = {
    id: 'u1',
    email: 'existing@example.com',
    username: 'existing',
    name: 'Existing User',
    profilePhoto: null,
    sessionId: 's1',
    createdAt: new Date().toISOString(),
  };

  it.each(['GOOGLE_ALREADY_REGISTERED', 'USER_EXISTS'])(
    'signs the user in with the native idToken on %s',
    async (code) => {
      sessionStorage.setItem(GOOGLE_SIGNUP_ID_TOKEN_KEY, 'native-id-token');
      mockGoogleRegister.mockRejectedValue({ code, message: 'already exists' });
      mockGoogleLogin.mockResolvedValue({ user: existingUser, expiresIn: 900 });

      render(<GoogleSignupPage />);
      await screen.findByLabelText('signup.username');
      await fillForm();
      submitForm();

      await waitFor(() => {
        expect(mockGoogleLogin).toHaveBeenCalledWith({
          idToken: 'native-id-token',
        });
      });
      expect(mockSetUser).toHaveBeenCalledWith(existingUser);
      expect(mockReplace).toHaveBeenCalledWith('/home');
      // Credential consumed — must not linger for a later signup attempt.
      expect(sessionStorage.getItem(GOOGLE_SIGNUP_ID_TOKEN_KEY)).toBeNull();
    },
  );

  it('restarts consent in login mode when only a spent web code is available', async () => {
    const hrefSetter = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        get href() {
          return '';
        },
        set href(v: string) {
          hrefSetter(v);
        },
        origin: 'https://nightwatch.in',
      },
      writable: true,
    });

    h.searchParams.current = { code: 'oauth-code' };
    mockGoogleRegister.mockRejectedValue({
      code: 'GOOGLE_ALREADY_REGISTERED',
      message: 'already exists',
    });

    render(<GoogleSignupPage />);
    await screen.findByLabelText('signup.username');
    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(hrefSetter).toHaveBeenCalledWith(
        'https://accounts.google.com/login',
      );
    });
    // No stale error left on screen — the user is being moved along, not blocked.
    expect(mockGoogleLogin).not.toHaveBeenCalled();
  });

  it('falls back to consent when the idToken login also fails', async () => {
    const hrefSetter = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        get href() {
          return '';
        },
        set href(v: string) {
          hrefSetter(v);
        },
        origin: 'https://nightwatch.in',
      },
      writable: true,
    });

    sessionStorage.setItem(GOOGLE_SIGNUP_ID_TOKEN_KEY, 'stale-id-token');
    mockGoogleRegister.mockRejectedValue({
      code: 'USER_EXISTS',
      message: 'already exists',
    });
    mockGoogleLogin.mockRejectedValue(new Error('idToken expired'));

    render(<GoogleSignupPage />);
    await screen.findByLabelText('signup.username');
    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(hrefSetter).toHaveBeenCalledWith(
        'https://accounts.google.com/login',
      );
    });
    expect(sessionStorage.getItem(GOOGLE_SIGNUP_ID_TOKEN_KEY)).toBeNull();
  });
});
