import { vi } from 'vitest';

export const injectTokenIntoUrl = vi.fn((url: string, token: string) => {
  if (!url || !token) return url;
  return url.replace('{token}', token).replace(/\{token\}/g, token);
});

export const wrapInProxy = vi.fn((url: string, _token: string) => {
  if (!url) return url;
  return `proxied:${url}`;
});
