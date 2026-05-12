import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgotPassword,
  loginUser,
  logoutUser,
  registerUser,
  resendOtp,
  resetPassword,
  validateInvite,
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

  describe('registerUser', () => {
    it('should call apiFetch with correct parameters', async () => {
      const mockResponse: LoginResponse = {
        requiresOtp: true,
        email: 'test@example.com',
        message: 'OTP sent',
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const registerData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        inviteCode: 'INVITE123',
      };

      const result = await registerUser(registerData);

      expect(fetchModule.apiFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include invite code if provided', async () => {
      const mockResponse: LoginResponse = {
        requiresOtp: true,
        email: 'test@example.com',
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const registerData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        inviteCode: 'INVITE123',
      };

      await registerUser(registerData);

      expect(fetchModule.apiFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData),
      });
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
          preferredServer: 's1' as 's1' | 's1',
          sessionId: 'test-session-1',
          createdAt: new Date().toISOString(),
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
          preferredServer: 's1' as 's1' | 's1',
          sessionId: 'test-session-2',
          createdAt: new Date().toISOString(),
        },
      };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await verifyOtp('test@example.com', '123456', 'register');

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            otp: '123456',
            context: 'register',
          }),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateInvite', () => {
    it('should call apiFetch with correct parameters', async () => {
      const mockResponse = { valid: true };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await validateInvite('INVITE123');

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/validate-invite',
        {
          method: 'POST',
          body: JSON.stringify({ inviteCode: 'INVITE123' }),
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return false for invalid invite', async () => {
      const mockResponse = { valid: false };

      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await validateInvite('INVALID');

      expect(result.valid).toBe(false);
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
