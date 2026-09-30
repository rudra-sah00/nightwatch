import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nativeGoogleSignIn } from '@/features/auth/google-api';

const initialize = vi.fn();
const logout = vi.fn();
const login = vi.fn();

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    initialize: (...args: unknown[]) => initialize(...args),
    logout: (...args: unknown[]) => logout(...args),
    login: (...args: unknown[]) => login(...args),
  },
}));

/** A successful plugin result carrying the idToken the backend verifies. */
const success = { result: { idToken: 'id-token' } };

/**
 * The message the plugin rejects with once Credential Manager has refused to
 * re-authenticate the device account and its single internal retry is spent.
 */
const REAUTH_ERROR =
  'Google Sign-In failed: [16] Account reauth failed. The plugin cleared ' +
  'Credential Manager credential-selection state and retried once.';

function setPlatform(platform: 'android' | 'ios') {
  window.Capacitor = { getPlatform: () => platform };
}

beforeEach(() => {
  vi.clearAllMocks();
  initialize.mockResolvedValue(undefined);
  logout.mockResolvedValue(undefined);
});

afterEach(() => {
  window.Capacitor = undefined;
});

describe('nativeGoogleSignIn on Android', () => {
  beforeEach(() => setPlatform('android'));

  it('does not clear credential state before signing in', async () => {
    login.mockResolvedValue(success);

    await expect(nativeGoogleSignIn()).resolves.toBe('id-token');

    // Pre-emptively clearing state is what left the plugin's "[16] Account
    // reauth failed" retry with nothing to clear, blocking affected accounts.
    expect(logout).not.toHaveBeenCalled();
    expect(login).toHaveBeenCalledTimes(1);
  });

  it('clears state and retries once after a reauth failure', async () => {
    login
      .mockRejectedValueOnce(new Error(REAUTH_ERROR))
      .mockResolvedValueOnce(success);

    await expect(nativeGoogleSignIn()).resolves.toBe('id-token');

    expect(logout).toHaveBeenCalledWith({ provider: 'google' });
    expect(login).toHaveBeenCalledTimes(2);
  });

  it('survives a logout that itself fails before the retry', async () => {
    login
      .mockRejectedValueOnce(new Error(REAUTH_ERROR))
      .mockResolvedValueOnce(success);
    logout.mockRejectedValue(new Error('clear failed'));

    await expect(nativeGoogleSignIn()).resolves.toBe('id-token');
    expect(login).toHaveBeenCalledTimes(2);
  });

  it('surfaces a reauth failure that persists through the retry', async () => {
    login.mockRejectedValue(new Error(REAUTH_ERROR));

    await expect(nativeGoogleSignIn()).rejects.toThrow('Account reauth failed');
    expect(login).toHaveBeenCalledTimes(2);
  });

  it('does not retry a cancellation or a console misconfiguration', async () => {
    login.mockRejectedValue(new Error('Google Sign-In cancelled by user'));

    await expect(nativeGoogleSignIn()).rejects.toThrow('cancelled by user');
    expect(logout).not.toHaveBeenCalled();
    expect(login).toHaveBeenCalledTimes(1);
  });

  it('rejects a result that carries no idToken', async () => {
    login.mockResolvedValue({ result: { accessToken: { token: 'a' } } });

    await expect(nativeGoogleSignIn()).rejects.toThrow('Google sign-in failed');
  });
});

describe('nativeGoogleSignIn on iOS', () => {
  beforeEach(() => setPlatform('ios'));

  it('still signs out first so the account picker always shows', async () => {
    login.mockResolvedValue(success);

    await expect(nativeGoogleSignIn()).resolves.toBe('id-token');

    expect(logout).toHaveBeenCalledWith({ provider: 'google' });
    expect(login).toHaveBeenCalledTimes(1);
  });

  it('does not retry, since the reauth failure is Android-only', async () => {
    login.mockRejectedValue(new Error(REAUTH_ERROR));

    await expect(nativeGoogleSignIn()).rejects.toThrow('Account reauth failed');
    expect(login).toHaveBeenCalledTimes(1);
  });
});
