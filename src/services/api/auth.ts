// Authentication Service
// Handles login, logout, and user session management

import { apiRequest, setTokens, setStoredUser, clearTokens, ApiResponse } from './client';

export interface User {
    id: string;
    username: string;
    name: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: User;
}

/**
 * Login with username and password
 */
export async function login(username: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });

    if (response.data) {
        setTokens(response.data.access_token, response.data.refresh_token);
        setStoredUser(response.data.user);
    }

    return response;
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    clearTokens();
}

/**
 * Get current authenticated user info
 */
export async function getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return apiRequest<{ user: User }>('/api/auth/me');
}
