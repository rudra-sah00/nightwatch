import { API_ROUTES } from '@/lib/constants';
import { apiFetch } from '@/lib/fetch';
import type { LoginResponse, User } from '@/types';

/**
 * Builds a Google OAuth consent URL for redirect-based flow (web/desktop).
 */
export function getGoogleOAuthUrl(mode: 'login' | 'connect'): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
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
 * Returns the idToken for backend verification.
 */
export async function nativeGoogleSignIn(): Promise<string> {
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
  await GoogleAuth.initialize();
  const result = await GoogleAuth.signIn();
  const idToken = result.authentication?.idToken;
  if (!idToken) throw new Error('Google sign-in failed: no idToken');
  return idToken;
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
