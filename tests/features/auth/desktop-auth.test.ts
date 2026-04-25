import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  desktopAuthExchange,
  desktopAuthInitiate,
  verifyOtp,
} from '@/features/auth/api';
import * as fetchModule from '@/lib/fetch';
import type { LoginResponse } from '@/types';

vi.mock('@/lib/fetch', () => import('./__mocks__/lib-fetch'));

describe('Desktop Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('desktopAuthInitiate', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { code: 'test-code-123' };
      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await desktopAuthInitiate();

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/desktop/initiate',
        { method: 'POST' },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('desktopAuthExchange', () => {
    it('should call the correct API endpoint with code', async () => {
      const mockResponse: LoginResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          profilePhoto: null,
          preferredServer: 's1' as 's1' | 's2',
          sessionId: 'session-1',
          createdAt: new Date().toISOString(),
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await desktopAuthExchange('test-code-123');

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/desktop/exchange',
        { method: 'POST', body: JSON.stringify({ code: 'test-code-123' }) },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('verifyOtp with desktopCode', () => {
    it('should pass desktopCode when provided', async () => {
      const mockResponse: LoginResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          profilePhoto: null,
          preferredServer: 's1' as 's1' | 's2',
          sessionId: 'session-1',
          createdAt: new Date().toISOString(),
        },
        desktopAuthorized: true,
      };
      vi.mocked(fetchModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await verifyOtp(
        'test@example.com',
        '123456',
        'login',
        undefined,
        'desktop-code-abc',
      );

      expect(fetchModule.apiFetch).toHaveBeenCalledWith(
        '/api/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            otp: '123456',
            context: 'login',
            mobileState: undefined,
            desktopCode: 'desktop-code-abc',
          }),
        },
      );
      expect(result.desktopAuthorized).toBe(true);
    });
  });

  describe('LoginResponse type', () => {
    it('should include desktopAuthorized field', () => {
      const response: LoginResponse = {
        desktopAuthorized: true,
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          profilePhoto: null,
          preferredServer: 's1' as 's1' | 's2',
          sessionId: 'session-1',
          createdAt: new Date().toISOString(),
        },
      };
      expect(response.desktopAuthorized).toBe(true);
    });

    it('should allow desktopAuthorized to be undefined', () => {
      const response: LoginResponse = {
        requiresOtp: true,
        email: 'test@example.com',
      };
      expect(response.desktopAuthorized).toBeUndefined();
    });
  });
});
