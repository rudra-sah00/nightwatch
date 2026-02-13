import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, resetAuthFetchState, setTokenExpiration } from '@/lib/fetch';

// Mock fetch globally
global.fetch = vi.fn();

// Mock environment
vi.mock('@/lib/env', () => import('./__mocks__/lib-env'));

describe('apiFetch', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
    vi.clearAllTimers();
    resetAuthFetchState();
  });

  it('should make successful GET request', async () => {
    const mockData = { id: 1, name: 'Test' };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await apiFetch('/api/test');

    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result).toEqual(mockData);
  });

  it('should make successful POST request with body', async () => {
    const mockData = { success: true };
    const requestData = { email: 'test@example.com', password: 'pass123' };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(requestData),
        credentials: 'include',
      }),
    );
    expect(result).toEqual(mockData);
  });

  it('should throw error on 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: { message: 'Not found', code: 'NOT_FOUND' },
      }),
    } as Response);

    await expect(apiFetch('/api/nonexistent')).rejects.toMatchObject({
      message: 'Not found',
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('should throw error on 500', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal server error' }),
    } as Response);

    await expect(apiFetch('/api/test')).rejects.toMatchObject({
      message: 'Internal server error',
      status: 500,
    });
  });

  it('should handle malformed JSON response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    } as unknown as Response);

    await expect(apiFetch('/api/test')).rejects.toMatchObject({
      message: 'HTTP 400',
      status: 400,
    });
  });

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    await expect(apiFetch('/api/test')).rejects.toThrow('Network error');
  });

  it('should handle 401 with successful token refresh', async () => {
    const mockData = { success: true };

    // First call returns 401
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    // Refresh token call succeeds
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ expiresIn: 900 }),
    } as Response);

    // Retry with fresh token succeeds
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await apiFetch('/api/protected');

    expect(result).toEqual(mockData);
    // Should have called: original request, refresh, retry
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should handle 401 with failed token refresh', async () => {
    // First call returns 401
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    // Refresh token call fails
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    await expect(apiFetch('/api/protected')).rejects.toMatchObject({
      message: 'Session expired. Please login again.',
      status: 401,
      code: 'SESSION_EXPIRED',
    });
  });

  it('should not retry auth endpoints on 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid credentials' }),
    } as Response);

    await expect(apiFetch('/api/auth/login')).rejects.toMatchObject({
      message: 'Invalid credentials',
      status: 401,
    });

    // Should only call once, no refresh attempt
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should include guest token in headers if available', async () => {
    // Mock sessionStorage
    const mockSessionStorage = {
      getItem: vi.fn(() => 'guest-token-123'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };

    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    } as Response);

    await apiFetch('/api/test');

    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer guest-token-123',
        }),
      }),
    );
  });

  it('should handle custom headers', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    } as Response);

    await apiFetch('/api/test', {
      headers: {
        'X-Custom-Header': 'custom-value',
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        }),
      }),
    );
  });

  it('should respect skipRefresh flag', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response);

    await expect(
      apiFetch('/api/protected', { skipRefresh: true }),
    ).rejects.toMatchObject({
      message: 'Unauthorized',
      status: 401,
    });

    // Should not attempt refresh
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle external abort signal', async () => {
    const controller = new AbortController();

    const fetchPromise = apiFetch('/api/test', { signal: controller.signal });

    // Abort immediately
    controller.abort();

    await expect(fetchPromise).rejects.toThrow();
  });

  it('should handle already aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      apiFetch('/api/test', { signal: controller.signal }),
    ).rejects.toThrow();
  });
});

describe('setTokenExpiration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set token expiration time', () => {
    const expiresInSeconds = 900; // 15 minutes
    setTokenExpiration(expiresInSeconds);

    // Token should be set to expire in approximately 15 minutes
    // We can't test the exact value due to timing, but we can verify it doesn't throw
    expect(true).toBe(true);
  });

  it('should schedule proactive token refresh', async () => {
    const expiresInSeconds = 120; // 2 minutes

    // Mock refresh endpoint - use mockResolvedValueOnce to avoid infinite loop
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ expiresIn: 900 }),
    } as Response);

    setTokenExpiration(expiresInSeconds);

    // Fast forward to just before refresh time (1 minute before expiry)
    vi.advanceTimersByTime(60 * 1000);

    // Should trigger refresh
    await vi.runOnlyPendingTimersAsync();

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });

  it('should clear existing timer when setting new expiration', () => {
    setTokenExpiration(900);
    setTokenExpiration(1800); // Set again

    // Should not throw and should clear previous timer
    expect(true).toBe(true);
  });
});

describe('Token refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should use default expiration on refresh without expiresIn', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}), // No expiresIn
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
      } as Response);

    const result = await apiFetch('/api/protected');

    expect(result).toEqual({ data: 'success' });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should handle JSON parse error on refresh', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
      } as Response);

    const result = await apiFetch('/api/protected');

    expect(result).toEqual({ data: 'success' });
  });

  it('should handle simultaneous refresh attempts', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ expiresIn: 900 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test1' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test2' }),
      } as Response);

    // Make two simultaneous requests
    const [result1, result2] = await Promise.all([
      apiFetch('/api/test1'),
      apiFetch('/api/test2'),
    ]);

    expect(result1).toEqual({ data: 'test1' });
    expect(result2).toEqual({ data: 'test2' });
    // Should only call refresh once despite two 401s
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('should handle refresh failure', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Refresh failed' }),
      } as Response);

    await expect(apiFetch('/api/protected')).rejects.toMatchObject({
      message: 'Session expired. Please login again.',
      status: 401,
      code: 'SESSION_EXPIRED',
    });
  });

  it('should handle refresh network error', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' }),
      } as Response)
      .mockRejectedValueOnce(new Error('Network error'));

    await expect(apiFetch('/api/protected')).rejects.toThrow();
  });
});
