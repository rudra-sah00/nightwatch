import { describe, expect, it } from 'vitest';

describe('Environment Variables', () => {
  it('has NEXT_PUBLIC_WS_URL defined', () => {
    expect(process.env.NEXT_PUBLIC_WS_URL).toBeDefined();
  });

  it('WS URL uses http, ws or wss protocol', () => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || '';
    // Can be http in dev mode (happy-dom) or ws/wss in production
    expect(wsUrl).toMatch(/^(https?|wss?):\/\//);
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
