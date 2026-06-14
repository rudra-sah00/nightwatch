import { API_ROUTES } from '@/lib/constants';
import { apiFetch } from '@/lib/fetch';
import type { LoginResponse, User } from '@/types';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

/**
 * Builds a Google OAuth consent URL for redirect-based flow (web/desktop).
 */
export function getGoogleOAuthUrl(mode: 'login' | 'connect'): string {
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: mode,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Native Google Sign-In for iOS/Android via Capacitor plugin.
 * Returns the accessToken for backend verification.
 */
export async function nativeGoogleSignIn(): Promise<string> {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  await SocialLogin.initialize({
    google: {
      webClientId: GOOGLE_CLIENT_ID,
      iOSClientId: GOOGLE_IOS_CLIENT_ID,
    },
  });
  // Always sign out first so the account picker shows every time
  await SocialLogin.logout({ provider: 'google' }).catch(() => {});
  const res = await SocialLogin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'] },
  });
  const result = res.result as {
    accessToken?: { token?: string };
    idToken?: string;
  };
  const token = result?.idToken;
  if (!token) throw new Error('Google sign-in failed');
  return token;
}

/**
 * Login with Google — sends auth code (web) or idToken (native) to backend.
 */
export async function googleLogin(
  payload: { code: string } | { idToken: string },
  options?: RequestInit,
): Promise<LoginResponse> {
  const body =
    'code' in payload
      ? {
          code: payload.code,
          redirectUri: `${window.location.origin}/auth/google/callback`,
        }
      : { idToken: payload.idToken };
  return apiFetch<LoginResponse>(API_ROUTES.AUTH.GOOGLE_LOGIN, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * Connect Google account to existing user (from profile page).
 */
export async function connectGoogle(
  payload: { code: string } | { idToken: string },
  options?: RequestInit,
): Promise<{ user: User }> {
  const body =
    'code' in payload
      ? {
          code: payload.code,
          redirectUri: `${window.location.origin}/auth/google/callback`,
        }
      : { idToken: payload.idToken };
  return apiFetch<{ user: User }>(API_ROUTES.GOOGLE.CONNECT, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * Disconnect Google account from the user's profile.
 */
export async function disconnectGoogle(
  options?: RequestInit,
): Promise<{ user: User }> {
  return apiFetch<{ user: User }>(API_ROUTES.GOOGLE.DISCONNECT, {
    method: 'POST',
    ...options,
  });
}
