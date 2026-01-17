// API Client - Core HTTP request handling with HttpOnly cookie authentication
// SECURITY: Tokens are stored in HttpOnly cookies, not accessible to JavaScript

const API_BASE = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_BACKEND_URL || '')
    : ''; // Relative path on client to use Next.js rewrites (avoids CORS)

// Storage keys - only for user info, NOT tokens
const USER_KEY = 'wr_user';

// Token Management - Frontend CANNOT access HttpOnly cookies
export function getAccessToken(): string | null {
    return null; // HttpOnly cookies are not accessible to JavaScript
}

export function getRefreshToken(): string | null {
    return null; // HttpOnly cookies are not accessible to JavaScript
}

export function setTokens(_access: string, _refresh: string): void {
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

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

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
            // Try to refresh token automatically
            if (endpoint !== '/api/auth/refresh' && endpoint !== '/api/auth/login') {
                const refreshResult = await tryRefreshToken();
                if (refreshResult) {
                    // Retry original request
                    return apiRequest<T>(endpoint, options);
                }
            }

            // If refresh failed or this was a refresh/login request, redirect to login
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                clearTokens();
                window.location.href = '/login';
            }
            return { error: 'Unauthorized' };
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

// Try to refresh token automatically
async function tryRefreshToken(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            return true;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }
    return false;
}
