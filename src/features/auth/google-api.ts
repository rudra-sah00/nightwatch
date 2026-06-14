import { API_ROUTES } from '@/lib/constants';
import { apiFetch } from '@/lib/fetch';
import type { LoginResponse, User } from '@/types';

/**
 * Builds a Google OAuth consent URL for redirect-based flow.
 * Works on web and Capacitor WebView (iOS/Android) — no native plugin needed.
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
 * Login with Google — sends the auth code to the backend.
 */
export async function googleLogin(
  code: string,
  options?: RequestInit,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(API_ROUTES.AUTH.GOOGLE_LOGIN, {
    method: 'POST',
    body: JSON.stringify({
      code,
      redirectUri: `${window.location.origin}/auth/google/callback`,
    }),
    ...options,
  });
}

/**
 * Connect Google account to existing user (from profile page).
 */
export async function connectGoogle(
  code: string,
  options?: RequestInit,
): Promise<{ user: User }> {
  return apiFetch<{ user: User }>(API_ROUTES.GOOGLE.CONNECT, {
    method: 'POST',
    body: JSON.stringify({
      code,
      redirectUri: `${window.location.origin}/auth/google/callback`,
    }),
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
