import { describe, expect, it } from 'vitest';
import { getCookie } from '@/lib/cookies';

describe('getCookie', () => {
  it('returns undefined when document is undefined', () => {
    const originalDocument = global.document;
    // @ts-expect-error
    delete global.document;

    expect(getCookie('test')).toBeUndefined();

    global.document = originalDocument;
  });

  it('extracts cookie value correctly', () => {
    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'foo=bar; baz=qux',
    });

    expect(getCookie('foo')).toBe('bar');
    expect(getCookie('baz')).toBe('qux');
  });

  it('returns undefined for missing cookie', () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'foo=bar',
    });

    expect(getCookie('missing')).toBeUndefined();
  });

  it('handles cookies with same prefix', () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'user_id=123; session_user_id=456',
    });

    expect(getCookie('user_id')).toBe('123');
    expect(getCookie('session_user_id')).toBe('456');
  });
});
