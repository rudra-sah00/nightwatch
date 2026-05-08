import type { ApiError } from '@/types';
import { getCookie } from './cookies';
import { env } from './env';

interface FetchOptions extends RequestInit {
  timeout?: number;
  skipRefresh?: boolean; // Flag to prevent infinite refresh loops
  rawResponse?: boolean; // Flag to return raw Response object
  retries?: number; // Number of retries on 5xx/network errors (default 0)
}

// Track if we're currently refreshing to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Track token expiration for proactive refresh
let tokenExpiresAt: number | null = null;
let refreshTimerId: NodeJS.Timeout | null = null;

/**
 * Reset internal state for testing
 */
export function resetAuthFetchState() {
  isRefreshing = false;
  refreshPromise = null;
  tokenExpiresAt = null;
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

/**
 * Schedule proactive token refresh before expiration
 * Big tech companies refresh tokens BEFORE they expire to avoid 401s
 */
function scheduleTokenRefresh() {
  // Clear any existing timer
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }

  if (!tokenExpiresAt) return;

  const now = Date.now();
  const timeUntilExpiry = tokenExpiresAt - now;

  // Refresh 1 minute before expiration (or immediately if already expired)
  const refreshIn = Math.max(0, timeUntilExpiry - 60000);

  refreshTimerId = setTimeout(async () => {
    await refreshAccessToken();
  }, refreshIn);
}

/**
 * Set token expiration time and schedule proactive refresh
 */
export function setTokenExpiration(expiresInSeconds: number) {
  tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  scheduleTokenRefresh();
}

/**
 * Returns the current token expiration timestamp (ms since epoch), or null if not set.
 * Used externally to check whether the timer is already armed before overwriting it.
 */
export function getTokenExpiresAt(): number | null {
  return tokenExpiresAt;
}

/**
 * Re-check token validity after app resume (Capacitor background → foreground).
 * If the token has expired while JS timers were frozen, refresh immediately.
 */
export async function revalidateTokenOnResume(): Promise<boolean> {
  if (!tokenExpiresAt) return true;
  if (Date.now() < tokenExpiresAt - 60000) {
    // Token still valid with >1 min margin — just reschedule the timer
    scheduleTokenRefresh();
    return true;
  }
  // Token expired or about to — refresh now
  return refreshAccessToken();
}

/**
 * Attempt to refresh the access token
 * Returns true if refresh was successful, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const baseUrl =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL ||
        env.BACKEND_URL
      : '';

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined'
            ? { 'x-csrf-token': getCookie('csrfToken') }
            : {}),
        },
      });

      if (response.ok) {
        // Extract new token expiration from response if available
        const data = await response.json().catch(() => ({}));

        if (
          data.accessToken &&
          typeof window !== 'undefined' &&
          sessionStorage.getItem('guest_token')
        ) {
          sessionStorage.setItem('guest_token', data.accessToken);
        }

        if (data.expiresIn) {
          setTokenExpiration(data.expiresIn);
        } else {
          // Default: assume 15 minute expiration
          setTokenExpiration(15 * 60);
        }
        return true;
      }

      // Only treat 401/403 as "session truly invalid" — these mean the
      // refresh token itself is rejected (expired, revoked, replayed).
      // Transient errors (502 during deploy, 500 Redis hiccup) should NOT
      // log the user out — the session is still valid, just unreachable.
      if (response.status === 401 || response.status === 403) {
        tokenExpiresAt = null;
      }
      return false;
    } catch {
      // Network error (offline, DNS failure, etc.) — don't invalidate session.
      // tokenExpiresAt stays set so apiFetch won't fire auth:expired.
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Fetch wrapper with credentials, error handling, and automatic token refresh
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    timeout = 30000,
    skipRefresh = false,
    retries = 0,
    ...fetchOptions
  } = options;

  // Use absolute URL on server, relative on client (to leverage Next.js proxying)
  const baseUrl =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL ||
        env.BACKEND_URL
      : '';

  // Skip refresh for auth endpoints - they return 401 for invalid credentials, not expired session
  const isAuthEndpoint =
    endpoint.includes('/auth/login') || endpoint.includes('/auth/register');

  // Track whether the user passed their own signal (for abort vs timeout distinction)
  const userSignal = fetchOptions.signal;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Handle external abort signal — propagate user abort separately
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort();
    } else {
      userSignal.addEventListener('abort', () =>
        controller.abort(userSignal.reason),
      );
    }
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...fetchOptions,
      credentials: 'include', // Send cookies
      headers: {
        ...(fetchOptions.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(typeof window !== 'undefined' &&
        sessionStorage.getItem('guest_token') &&
        !getCookie('accessToken')
          ? { Authorization: `Bearer ${sessionStorage.getItem('guest_token')}` }
          : {}),
        ...(typeof window !== 'undefined' &&
        ['POST', 'PATCH', 'DELETE', 'PUT'].includes(
          fetchOptions.method || 'GET',
        ) &&
        getCookie('csrfToken')
          ? { 'x-csrf-token': getCookie('csrfToken') }
          : {}),
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized - attempt token refresh (but not for auth endpoints)
    if (response.status === 401 && !skipRefresh && !isAuthEndpoint) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry the original request with fresh token
        return apiFetch<T>(endpoint, { ...options, skipRefresh: true });
      }

      // Refresh failed — only logout if session is truly invalid
      // (tokenExpiresAt cleared by 401/403 from refresh endpoint).
      // Transient errors (5xx, network) keep tokenExpiresAt set.
      if (!tokenExpiresAt && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }

      const error = new Error('SESSION_EXPIRED') as Error & ApiError;
      error.status = 401;
      error.code = 'SESSION_EXPIRED';
      throw error;
    }

    if (!response.ok) {
      let errorData: unknown = {};
      try {
        errorData = await response.json();
      } catch (_e) {
        // Ignore JSON parse errors
      }

      const msg =
        (errorData as Record<string, unknown>).error &&
        typeof (errorData as Record<string, unknown>).error === 'object'
          ? (
              (errorData as Record<string, unknown>).error as Record<
                string,
                unknown
              >
            ).message
          : (errorData as Record<string, unknown>).error ||
            (errorData as Record<string, unknown>).message ||
            `HTTP ${response.status}`;
      const error = new Error(String(msg)) as Error & ApiError;
      error.status = response.status;
      error.code = String(
        ((errorData as Record<string, unknown>).error &&
        typeof (errorData as Record<string, unknown>).error === 'object'
          ? (
              (errorData as Record<string, unknown>).error as Record<
                string,
                unknown
              >
            ).code
          : undefined) || (errorData as Record<string, unknown>).code,
      );
      throw error;
    }

    if (options.rawResponse) {
      return response as unknown as T;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      // Distinguish user-initiated abort from timeout
      if (userSignal?.aborted) {
        throw error; // Propagate the original AbortError
      }
      const timeoutErr = new Error('REQUEST_TIMEOUT') as Error & ApiError;
      timeoutErr.status = 408;
      timeoutErr.code = 'REQUEST_TIMEOUT';
      throw timeoutErr;
    }

    // Retry on network errors or 5xx if retries remain
    if (retries > 0 && !userSignal?.aborted) {
      const isRetryable =
        error instanceof Error &&
        (error.message.includes('fetch') ||
          error.message.includes('network') ||
          ('status' in error &&
            (error as ApiError).status !== undefined &&
            (error as ApiError).status! >= 500));
      if (isRetryable) {
        const delay = (options.retries! - retries + 1) * 1000; // 1s, 2s, ...
        await new Promise((r) => setTimeout(r, delay));
        return apiFetch<T>(endpoint, { ...options, retries: retries - 1 });
      }
    }

    throw error;
  }
}
