import { API_ROUTES } from '@/lib/constants';
import { apiFetch } from '@/lib/fetch';
import type { LoginResponse, User } from '@/types';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

/**
 * sessionStorage key holding a pending Google signup between the Google
 * handshake and the profile step.
 *
 * Needed because the web flow leaves the page: Google redirects to
 * `/auth/google/callback`, which resolves the profile and then hands back to
 * `/continue` to collect a username. Session-scoped and same-origin, and it holds
 * only an opaque ticket — never the Google credential itself.
 */
export const GOOGLE_SIGNUP_TICKET_KEY = 'google_signup_pending';

/** Verified Google profile used to pre-fill the profile step. */
export interface GoogleProfile {
  name: string;
  email: string;
  picture?: string;
}

/** `continue` outcome when no account exists yet and a profile is required. */
export interface GoogleProfileRequired {
  needsProfile: true;
  ticket: string;
  profile: GoogleProfile;
  suggestedUsername: string;
}

/**
 * Either half of "Continue with Google": a session for an existing user, or a
 * ticket plus profile for someone who still needs an account.
 */
export type GoogleContinueResponse = LoginResponse | GoogleProfileRequired;

/** Narrows a `continue` response to the signup branch. */
export function isProfileRequired(
  response: GoogleContinueResponse,
): response is GoogleProfileRequired {
  return (response as GoogleProfileRequired).needsProfile === true;
}

/**
 * Builds a Google OAuth consent URL for redirect-based flow (web/desktop).
 *
 * `login` covers both signing in and signing up — the backend decides which,
 * and the callback continues into the profile step when an account is needed.
 */
export function getGoogleOAuthUrl(mode: 'login' | 'connect'): string {
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const isDesktop = 'electronAPI' in window;
  const state = isDesktop ? `desktop_${mode}` : mode;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
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
 * Continue with Google — sends auth code (web) or idToken (native) to backend.
 *
 * Resolves to a session when the Google account is already linked, or to a
 * {@link GoogleProfileRequired} ticket when the account still has to be created.
 * Use {@link isProfileRequired} to tell them apart.
 */
export async function googleContinue(
  payload: { code: string } | { idToken: string },
  options?: RequestInit,
): Promise<GoogleContinueResponse> {
  const body =
    'code' in payload
      ? {
          code: payload.code,
          redirectUri: `${window.location.origin}/auth/google/callback`,
        }
      : { idToken: payload.idToken };
  return apiFetch<GoogleContinueResponse>(API_ROUTES.AUTH.GOOGLE_CONTINUE, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * Completes a Google signup against a ticket from {@link googleContinue}.
 *
 * The Google credential is not resent — the backend already verified it and
 * holds the profile against the ticket. Email is intentionally not a parameter:
 * it comes from the ticket, so it is always the address Google confirmed.
 *
 * A `USERNAME_TAKEN` rejection leaves the ticket valid, so the caller can let
 * the user try a different username without another trip through Google.
 */
export async function googleComplete(
  values: {
    ticket: string;
    username: string;
    name: string;
    password: string;
  },
  options?: RequestInit,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(API_ROUTES.AUTH.GOOGLE_COMPLETE, {
    method: 'POST',
    body: JSON.stringify(values),
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

/**
 * Parks a pending Google signup so it survives the redirect back from Google.
 */
export function storePendingGoogleSignup(pending: GoogleProfileRequired): void {
  sessionStorage.setItem(GOOGLE_SIGNUP_TICKET_KEY, JSON.stringify(pending));
}

/**
 * Reads a pending Google signup, or `null` when there is none or it is corrupt.
 */
export function readPendingGoogleSignup(): GoogleProfileRequired | null {
  try {
    const raw = sessionStorage.getItem(GOOGLE_SIGNUP_TICKET_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as GoogleProfileRequired;
    return parsed?.ticket ? parsed : null;
  } catch {
    return null;
  }
}

/** Clears a pending Google signup once it is finished or abandoned. */
export function clearPendingGoogleSignup(): void {
  sessionStorage.removeItem(GOOGLE_SIGNUP_TICKET_KEY);
}
