import { describe, expect, it, vi } from 'vitest';

describe('Environment Variables Error', () => {
  it('throws error when required variables are missing', async () => {
    // Reset process.env for this test
    const originalEnv = { ...process.env };

    // Clear required variables
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    delete process.env.NEXT_PUBLIC_WS_URL;
    delete process.env.NEXT_PUBLIC_AGORA_APP_ID;

    // Reset modules to ensure fresh import of lib/env
    vi.resetModules();

    try {
      // Must use require/import inside the test because it throws at top level
      await import('@/lib/env');
      // If it doesn't throw, fail the test
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      if (error instanceof Error) {
        expect(error.message).toContain(
          'Missing required environment variables',
        );
      }
    }

    // Restore env
    process.env = originalEnv;
  });

  it('handles optional variables missing', async () => {
    const originalEnv = { ...process.env };

    // Set required but missing optional
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://api';
    process.env.NEXT_PUBLIC_WS_URL = 'ws://api';
    process.env.NEXT_PUBLIC_AGORA_APP_ID = 'app_id';
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    vi.resetModules();
    const { env } = await import('@/lib/env');

    expect(env.TURNSTILE_SITE_KEY).toBe('');

    process.env = originalEnv;
  });
});
