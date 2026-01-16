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
export async function getCurrentUser(options: RequestInit = {}): Promise<ApiResponse<{ user: User }>> {
    return apiRequest<{ user: User }>('/api/auth/me', options);
}

// ============ Session Management ============

export interface SessionInfo {
    id: string;
    user_id: string;
    device_info?: string;
    ip_address?: string;
    last_used: string;
    created_at: string;
    expires_at: string;
}

export interface SessionsResponse {
    sessions: SessionInfo[];
}

/**
 * Get all active sessions for current user
 */
export async function getSessions(): Promise<ApiResponse<SessionsResponse>> {
    return apiRequest<SessionsResponse>('/api/auth/sessions');
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
    });
}
