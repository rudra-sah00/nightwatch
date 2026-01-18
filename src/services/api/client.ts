// API Client - Core HTTP request handling with HttpOnly cookie authentication
// SECURITY: Tokens are stored in HttpOnly cookies, not accessible to JavaScript

const API_BASE = typeof window === 'undefined' ? process.env.BACKEND_URL || '' : ''; // Relative path on client to use Next.js rewrites (avoids CORS)

// Storage keys - only for user info, NOT tokens
const USER_KEY = 'wr_user';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

// Subscribe to refresh result
function subscribeToRefresh(callback: (success: boolean) => void) {
  refreshSubscribers.push(callback);
}

// Notify all subscribers
function notifyRefreshSubscribers(success: boolean) {
  for (const callback of refreshSubscribers) {
    callback(success);
  }
  refreshSubscribers = [];
}

// Token Management - Frontend CANNOT access HttpOnly cookies
export function getAccessToken(): string | null {
  return null; // HttpOnly cookies are not accessible to JavaScript
}

export function getRefreshToken(): string | null {
  return null; // HttpOnly cookies are not accessible to JavaScript
}

export function setTokens(): void {
  // Backend sets HttpOnly cookies automatically via Set-Cookie headers
  // Frontend doesn't need to do anything
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  // Only clear user info from localStorage
  // Cookies are cleared by backend on logout
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): { id: string; username: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(USER_KEY);

  if (!user || user === 'undefined') {
    if (user === 'undefined') localStorage.removeItem(USER_KEY);
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUser(user: { id: string; username: string; name: string }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  // Check if user info exists (optimistic check)
  // Actual auth status is verified by backend via HttpOnly cookie
  return !!getStoredUser();
}

export function getApiBase(): string {
  return API_BASE;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Core Request Function
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  // biome-ignore lint/suspicious/noExplicitAny: Need flexible type for header manipulation
  const headers: any = {
    ...options.headers,
  };

  // Only set Content-Type to application/json if not already set and body is not FormData
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // IMPORTANT: Include credentials to send HttpOnly cookies
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Always send cookies with requests
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      // Parse response to check for session termination
      const data = await response.json().catch(() => ({}));

      // Check for session terminated error (logged in from another device)
      if (data.code === 'SESSION_TERMINATED') {
        // Force immediate logout with specific message
        forceLogoutWithMessage(
          data.message ||
            'Your session has been terminated because you logged in from another device.'
        );
        return { error: 'Session terminated' };
      }

      // Don't try to refresh for auth endpoints - just return error
      // Let the caller handle it (especially important for /api/auth/me during init)
      if (
        endpoint === '/api/auth/refresh' ||
        endpoint === '/api/auth/login' ||
        endpoint === '/api/auth/me'
      ) {
        return { error: data.error || 'Unauthorized' };
      }

      // Try to refresh token automatically (with deduplication)
      const refreshResult = await tryRefreshToken();
      if (refreshResult) {
        // Retry original request with fresh token
        return apiRequest<T>(endpoint, options);
      }

      // Refresh failed - force full logout
      forceLogout();
      return { error: 'Session expired' };
    }

    const data = await response.json();
    return response.ok ? { data } : { error: data.error || 'Request failed' };
  } catch {
    return { error: 'Network error' };
  }
}

// Get a short-lived WebSocket token (for WebSocket connections that can't use cookies)
export async function getWebSocketToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/ws-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
  } catch (error) {
    console.error('Failed to get WebSocket token:', error);
  }
  return null;
}

/**
 * Force logout - clears all local state and redirects to login
 * Used when auth is definitively invalid (not just a network error)
 */
export function forceLogout(): void {
  forceLogoutWithMessage();
}

/**
 * Force logout with optional message - clears all local state and redirects to login
 * Used for session termination (logged in from another device)
 */
export function forceLogoutWithMessage(message?: string): void {
  if (typeof window === 'undefined') return;

  // Clear all local storage auth data
  localStorage.removeItem(USER_KEY);

  // Store message for display on login page
  if (message) {
    sessionStorage.setItem('session_terminated_message', message);
  }

  // Clear any other session storage (except the message)
  const savedMessage = sessionStorage.getItem('session_terminated_message');
  sessionStorage.clear();
  if (savedMessage) {
    sessionStorage.setItem('session_terminated_message', savedMessage);
  }

  // Dispatch custom event so React components can react
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { message } }));

  // Only redirect if not already on login page
  if (!window.location.pathname.includes('/login')) {
    // Use replace to prevent back button returning to protected page
    window.location.replace('/login');
  }
}

/**
 * Try to refresh token automatically with request deduplication
 * Multiple concurrent requests will share the same refresh attempt
 */
async function tryRefreshToken(): Promise<boolean> {
  // If already refreshing, wait for the result
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeToRefresh(resolve);
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const success = response.ok;
    notifyRefreshSubscribers(success);
    isRefreshing = false;
    return success;
  } catch (error) {
    console.error('Token refresh failed:', error);
    notifyRefreshSubscribers(false);
    isRefreshing = false;
    return false;
  }
}
