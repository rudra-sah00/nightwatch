// API Client Base - Core request handling and token management

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

// Storage keys
const ACCESS_TOKEN_KEY = 'wr_access_token';
const REFRESH_TOKEN_KEY = 'wr_refresh_token';
const USER_KEY = 'wr_user';

// ============ Token Management ============

export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): { id: string; username: string; name: string } | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

export function setStoredUser(user: { id: string; username: string; name: string }): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
    return !!getAccessToken();
}

// ============ API Response Type ============

export interface ApiResponse<T> {
    data?: T;
    error?: string;
}

// ============ Core Request Function ============

async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) return false;

        const data = await response.json();
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        return true;
    } catch {
        return false;
    }
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const token = getAccessToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        // Handle 401 - try refresh
        if (response.status === 401 && !endpoint.includes('/auth/')) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                (headers as Record<string, string>)['Authorization'] = `Bearer ${getAccessToken()}`;
                const retry = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
                const retryData = await retry.json();
                return retry.ok ? { data: retryData } : { error: retryData.error };
            }
            clearTokens();
            if (typeof window !== 'undefined') window.location.href = '/login';
            return { error: 'Session expired' };
        }

        const data = await response.json();
        return response.ok ? { data } : { error: data.error || 'Request failed' };
    } catch (error) {
        console.error('API Error:', error);
        return { error: 'Network error' };
    }
}

export function getApiBase(): string {
    return API_BASE;
}
