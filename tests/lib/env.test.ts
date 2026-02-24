import { describe, expect, it } from 'vitest';
import { env } from '@/lib/env';

describe('Environment Variables', () => {
  it('has required variables in env object', () => {
    expect(env.BACKEND_URL).toBeDefined();
    expect(env.WS_URL).toBeDefined();
    expect(env.AGORA_APP_ID).toBeDefined();
  });

  it('has fallback for optional variables', () => {
    expect(env.TURNSTILE_SITE_KEY).toBeDefined();
  });
});

describe('Build Configuration', () => {
  it('NODE_ENV is defined', () => {
    expect(process.env.NODE_ENV).toBeDefined();
    expect(['development', 'test', 'production']).toContain(
      process.env.NODE_ENV,
    );
  });
});
