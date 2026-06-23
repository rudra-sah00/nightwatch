import { beforeEach, describe, expect, it } from 'vitest';
import { setCookie } from '@/lib/cookies';

describe('setCookie', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  it('sets cookie with default options', () => {
    setCookie('theme', 'dark');
    expect(document.cookie).toBe(
      'theme=dark;path=/;max-age=31536000;samesite=lax',
    );
  });

  it('sets cookie with custom options', () => {
    setCookie('token', 'abc', 'path=/;secure;max-age=3600');
    expect(document.cookie).toBe('token=abc;path=/;secure;max-age=3600');
  });

  it('does nothing when document is undefined', () => {
    const originalDoc = globalThis.document;
    // @ts-expect-error - simulating SSR
    delete globalThis.document;
    expect(() => setCookie('key', 'val')).not.toThrow();
    globalThis.document = originalDoc;
  });
});
