import type { ApiError } from '@/types';
import { getCookie } from './cookies';
import { env } from './env';

interface FetchOptions extends RequestInit {
  timeout?: number;
  skipRefresh?: boolean; // Flag to prevent infinite refresh loops
  rawResponse?: boolean; // Flag to return raw Response object
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

      // Refresh failed - session is invalid
      tokenExpiresAt = null;
      return false;
    } catch {
      tokenExpiresAt = null;
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
  const { timeout = 30000, skipRefresh = false, ...fetchOptions } = options;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Handle external abort signal
  if (fetchOptions.signal) {
    if (fetchOptions.signal.aborted) {
      controller.abort();
    } else {
      fetchOptions.signal.addEventListener('abort', () => controller.abort());
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
        sessionStorage.getItem('guest_token')
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

      // Refresh failed - throw error to trigger logout
      const error = new Error('Session expired. Please login again.') as Error &
        ApiError;
      error.status = 401;
      error.code = 'SESSION_EXPIRED';

      if (typeof window !== 'undefined') {
        // Fire custom event so AuthProvider can handle global logout + redirect
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }

      throw error;
    }

    if (!response.ok) {
      // biome-ignore lint/suspicious/noExplicitAny: API error structure is dynamic
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (_e) {
        // Ignore JSON parse errors
      }

      const msg =
        errorData.error?.message ||
        errorData.error ||
        errorData.message ||
        `HTTP ${response.status}`;
      const error = new Error(msg) as Error & ApiError;
      error.status = response.status;
      error.code = errorData.error?.code || errorData.code;
      throw error;
    }

    if (options.rawResponse) {
      return response as unknown as T;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutErr = new Error(
        'Request timed out. Please check your connection and try again.',
      ) as Error & ApiError;
      timeoutErr.status = 408;
      throw timeoutErr;
    }

    throw error;
  }
}
