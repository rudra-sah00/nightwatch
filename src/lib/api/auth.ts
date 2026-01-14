// Auth API Module

import { apiRequest, setTokens, setStoredUser, clearTokens } from './client';

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user: { id: string; username: string; name: string };
}

export async function login(username: string, password: string) {
    const result = await apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });

    if (result.data) {
        setTokens(result.data.access_token, result.data.refresh_token);
        setStoredUser(result.data.user);
    }

    return result;
}

export async function logout(): Promise<void> {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    clearTokens();
}

export async function getCurrentUser() {
    return apiRequest<{ id: string; username: string; name: string }>('/api/auth/me');
}
