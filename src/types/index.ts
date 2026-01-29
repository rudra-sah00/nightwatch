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
  user?: User; // Optional now because initiate step doesn't return user
  requiresOtp?: boolean;
  email?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface LogoutResponse {
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string; // e.g., 'SESSION_EXPIRED'
  details?: Array<{ path: string; message: string }>;
}

// WebSocket types
export interface ForceLogoutPayload {
  reason: 'new_login' | 'invalid_session';
  message: string;
}
