import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgotPassword,
  loginUser,
  logoutUser,
  resendOtp,
  resetPassword,
  verifyOtp,
} from '@/features/auth/api';
import * as fetchModule from '@/lib/fetch';
import type { LoginResponse, LogoutResponse } from '@/types';

// Mock apiFetch
vi.mock('@/lib/fetch', () => import('./__mocks__/lib-fetch'));

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginUser', () => {
    it('should call apiFetch with correct parameters', async () => {
      const mockResponse: LoginResponse = {
        requiresOtp: true,
        email: 'test@example.com',
        message: 'OTP sent',
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await loginUser(loginData);

      expect(fetchModule.apiFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should pass additional options to apiFetch', async () => {
      const mockResponse: LoginResponse = {
        requiresOtp: true,
        email: 'test@example.com',
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const customOptions = { signal: new AbortController().signal };

      await loginUser(loginData, customOptions);

      expect(fetchModule.apiFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
        ...customOptions,
      });
    });
  });

  describe('logoutUser', () => {
    it('should call apiFetch with correct parameters', async () => {
      const mockResponse: LogoutResponse = {
        message: 'Logged out successfully',
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await logoutUser();

      expect(fetchModule.apiFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('verifyOtp', () => {
    it('should call apiFetch with correct parameters for login', async () => {
      const mockResponse: LoginResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          profilePhoto: null,
          sessionId: 'test-session-1',
          createdAt: new Date().toISOString(),
          googleId: null,
          googleEmail: null,
        },
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await verifyOtp('test@example.com', '123456', 'login');

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            otp: '123456',
            context: 'login',
          }),
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should call apiFetch with correct parameters for register', async () => {
      const mockResponse: LoginResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          profilePhoto: null,
          sessionId: 'test-session-2',
          createdAt: new Date().toISOString(),
          googleId: null,
          googleEmail: null,
        },
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await verifyOtp('test@example.com', '123456', 'login');

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            otp: '123456',
            context: 'login',
          }),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('resendOtp', () => {
    it('should call apiFetch with correct parameters', async () => {
      const mockResponse = {
        message: 'Code resent successfully',
        nextCooldown: 60,
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await resendOtp('test@example.com');

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/resend-otp',
        {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('forgotPassword', () => {
    it('should call apiFetch with correct parameters', async () => {
      const mockResponse = {
        message: 'Password reset instructions sent to your email',
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await forgotPassword({ email: 'test@example.com' });

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('resetPassword', () => {
    it('should call apiFetch with correct parameters', async () => {
      const mockResponse = { message: 'Password reset successfully' };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await resetPassword('reset-token', 'NewPassword123!');

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({
            token: 'reset-token',
            newPassword: 'NewPassword123!',
          }),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
