// User types
export interface User {
    id: string;
    name: string;
    username: string | null;
    email: string;
    profilePhoto: string | null;
    sessionId: string;
    createdAt: string;
}

// Auth types
export interface LoginResponse {
    user: User;
}

export interface LogoutResponse {
    message: string;
}

export interface ApiError {
    message: string;
    status?: number;
}

// WebSocket types
export interface ForceLogoutPayload {
    reason: 'new_login' | 'invalid_session';
    message: string;
}
