import type { ApiError } from '@/types';
import { env } from './env';

interface FetchOptions extends RequestInit {
  timeout?: number;
  skipRefresh?: boolean; // Flag to prevent infinite refresh loops
}

// Track if we're currently refreshing to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token
 * Returns true if refresh was successful, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${env.BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return true;
      }

      // Refresh failed - session is invalid
      return false;
    } catch {
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
  const { timeout = 10000, skipRefresh = false, ...fetchOptions } = options;

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
    const response = await fetch(`${env.BACKEND_URL}${endpoint}`, {
      ...fetchOptions,
      credentials: 'include', // Send cookies
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && !skipRefresh) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry the original request with fresh token
        return apiFetch<T>(endpoint, { ...options, skipRefresh: true });
      }

      // Refresh failed - throw error to trigger logout
      const error: ApiError = {
        message: 'Session expired. Please login again.',
        status: 401,
        code: 'SESSION_EXPIRED',
      };
      throw error;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message:
          errorData.error || errorData.message || `HTTP ${response.status}`,
        status: response.status,
      };
      throw error;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw { message: 'Request timeout', status: 408 } as ApiError;
    }

    throw error;
  }
}
