import { describe, expect, it } from 'vitest';
import type {
  ApiError,
  ForceLogoutPayload,
  LoginResponse,
  LogoutResponse,
  User,
} from '@/types';

describe('User Type', () => {
  it('creates valid User object', () => {
    const user: User = {
      id: 'user-123',
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
      profilePhoto: 'https://example.com/photo.jpg',
      preferredServer: 's2' as 's2' | 's2',
      sessionId: 'session-abc',
      createdAt: '2024-01-15T10:00:00Z',
    };

    expect(user.id).toBe('user-123');
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
  });

  it('handles null username', () => {
    const user: User = {
      id: 'user-123',
      name: 'John Doe',
      username: null,
      email: 'john@example.com',
      profilePhoto: null,
      preferredServer: 's2' as 's2' | 's2',
      sessionId: 'session-abc',
      createdAt: '2024-01-15T10:00:00Z',
    };

    expect(user.username).toBeNull();
    expect(user.profilePhoto).toBeNull();
  });
});

describe('LoginResponse Type', () => {
  it('creates valid login response with tokens', () => {
    const response: LoginResponse = {
      user: {
        id: 'user-123',
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        profilePhoto: null,
        preferredServer: 's2' as 's2' | 's2',
        sessionId: 'session-abc',
        createdAt: '2024-01-15T10:00:00Z',
      },
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    };

    expect(response.accessToken).toBe('access-token-123');
    expect(response.user?.id).toBe('user-123');
  });

  it('creates OTP required response', () => {
    const response: LoginResponse = {
      requiresOtp: true,
      email: 'john@example.com',
      message: 'OTP sent to your email',
    };

    expect(response.requiresOtp).toBe(true);
    expect(response.user).toBeUndefined();
    expect(response.accessToken).toBeUndefined();
  });
});

describe('LogoutResponse Type', () => {
  it('creates valid logout response', () => {
    const response: LogoutResponse = {
      message: 'Logged out successfully',
    };

    expect(response.message).toBeTruthy();
  });
});

describe('ApiError Type', () => {
  it('creates basic API error', () => {
    const error: ApiError = {
      message: 'Not found',
      status: 404,
    };

    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
  });

  it('creates API error with validation details', () => {
    const error: ApiError = {
      message: 'Validation failed',
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [
        { path: 'email', message: 'Invalid email format' },
        { path: 'password', message: 'Password too short' },
      ],
    };

    expect(error.details).toHaveLength(2);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('creates session expired error', () => {
    const error: ApiError = {
      message: 'Session expired',
      status: 401,
      code: 'SESSION_EXPIRED',
    };

    expect(error.code).toBe('SESSION_EXPIRED');
  });
});

describe('ForceLogoutPayload Type', () => {
  it('creates new login force logout', () => {
    const payload: ForceLogoutPayload = {
      reason: 'new_login',
      message: 'You have been logged in from another device',
    };

    expect(payload.reason).toBe('new_login');
    expect(payload.message).toBeTruthy();
  });

  it('creates invalid session force logout', () => {
    const payload: ForceLogoutPayload = {
      reason: 'invalid_session',
      message: 'Your session is invalid',
    };

    expect(payload.reason).toBe('invalid_session');
  });
});
