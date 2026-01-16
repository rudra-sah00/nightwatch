// API Client - Core HTTP request handling and token management
// Fully Refactored for Cookie-Only Authentication (HttpOnly)

const API_BASE = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080')
    : ''; // Relative path on client to use Next.js rewrites (avoids CORS)

// Storage keys
const USER_KEY = 'wr_user';
// Note: Tokens are no longer stored in LocalStorage. They are HttpOnly cookies.

// Cookie Helpers (Only used for clearing non-HttpOnly cookies if any exist)
function eraseCookie(name: string) {
    if (typeof window === 'undefined') return;
    document.cookie = name + '=; Max-Age=-99999999; path=/;';
}

// Token Management - No-Ops for Frontend
export function getAccessToken(): string | null {
    return null; // Frontend cannot access HttpOnly cookie
}

export function getRefreshToken(): string | null {
    return null;
}

export function setTokens(_access: string, _refresh: string): void {
    // Backend sets HttpOnly cookies. Frontend stores nothing.
    // Ensure any legacy storage is cleared
    if (typeof window === 'undefined') return;
    localStorage.removeItem('wr_access_token');
    localStorage.removeItem('wr_refresh_token');
}

export function clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_KEY);
    // Tokens are cleared by calling /api/auth/logout which sets expired cookies
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
    // Optimistic: Check if user info is present
    // Exact verification happens on API call
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

    // No Authorization header injected. Browser handles Cookies.

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
            // Note: Automatic refresh logic is tricky with HttpOnly cookies on client without a dedicated endpoint that reads cookies
            // Since backend handles refresh via /refresh endpoint, we can try calling it?
            // But if request failed with 401, it means Access Token expired.
            // Ideally, we could try hitting /refresh (POST with empty body?) if backend supports it.
            // But for now, simple logout on 401.
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
