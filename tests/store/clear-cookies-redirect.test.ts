import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
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
  setDeliberateLogout: vi.fn(),
}));
vi.mock('@/features/music/store/use-music-store', () => ({
  useMusicStore: { getState: () => ({ reset: vi.fn() }) },
}));
vi.mock('@/lib/device-id', () => ({ getDeviceId: () => 'test-device-id' }));
vi.mock('@/features/auth/api', () => ({
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  verifyOtp: vi.fn(),
  resendOtp: vi.fn(),
  unregisterPushToken: vi.fn().mockResolvedValue(undefined),
}));

import { logoutUser } from '@/features/auth/api';
import { clearCookiesAndRedirect } from '@/store/use-auth-store';

/** Captures navigation instead of letting the test environment perform it. */
let navigated: string | null;

beforeEach(() => {
  vi.clearAllMocks();
  navigated = null;
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      set href(value: string) {
        navigated = value;
      },
      get href() {
        return navigated ?? '';
      },
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * `refreshToken` is HttpOnly, so only the backend logout clears it, and the
 * proxy guard keys off exactly that cookie. Redirecting before the response
 * lands leaves the cookie in place and the guard bounces /continue to /home,
 * making the login page unreachable.
 */
describe('clearCookiesAndRedirect', () => {
  it('waits for logout before navigating', async () => {
    let releaseLogout: () => void = () => {};
    vi.mocked(logoutUser).mockReturnValue(
      new Promise<void>((resolve) => {
        releaseLogout = resolve;
      }) as unknown as ReturnType<typeof logoutUser>,
    );

    clearCookiesAndRedirect();
    await Promise.resolve();
    expect(navigated).toBeNull();

    releaseLogout();
    await vi.waitFor(() => expect(navigated).not.toBeNull());
  });

  it('lands on the login page with the signed-out flag', async () => {
    vi.mocked(logoutUser).mockResolvedValue(
      undefined as unknown as Awaited<ReturnType<typeof logoutUser>>,
    );

    clearCookiesAndRedirect();

    await vi.waitFor(() => expect(navigated).toBe('/continue?signedOut=1'));
  });

  it('still navigates when logout rejects', async () => {
    vi.mocked(logoutUser).mockRejectedValue(new Error('offline'));

    clearCookiesAndRedirect();

    await vi.waitFor(() => expect(navigated).toBe('/continue?signedOut=1'));
  });

  it('gives up on a logout that never settles rather than trapping the user', async () => {
    vi.useFakeTimers();
    vi.mocked(logoutUser).mockReturnValue(
      new Promise<never>(() => {}) as ReturnType<typeof logoutUser>,
    );

    clearCookiesAndRedirect();
    await vi.advanceTimersByTimeAsync(1999);
    expect(navigated).toBeNull();

    await vi.advanceTimersByTimeAsync(2);
    expect(navigated).toBe('/continue?signedOut=1');
  });

  it('stores a flash message for the login page to show', async () => {
    vi.mocked(logoutUser).mockResolvedValue(
      undefined as unknown as Awaited<ReturnType<typeof logoutUser>>,
    );

    clearCookiesAndRedirect('Session expired');

    expect(sessionStorage.getItem('auth_flash')).toContain('Session expired');
    await vi.waitFor(() => expect(navigated).not.toBeNull());
  });
});
