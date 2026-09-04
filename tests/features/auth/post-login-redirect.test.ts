import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POST_LOGIN_PATH,
  resolvePostLoginPath,
} from '@/features/auth/lib/post-login-redirect';

describe('resolvePostLoginPath — accepts safe destinations', () => {
  it.each([
    '/home',
    '/watch/abc123',
    '/watch/abc123?t=42',
    '/profile/security',
    '/music/album/1',
    '/manga/title/42#chapter-3',
    // Shares a prefix with /continue but is a real destination.
    '/continue-watching',
  ])('keeps %s', (path) => {
    expect(resolvePostLoginPath(path)).toBe(path);
  });
});

describe('resolvePostLoginPath — rejects open redirects', () => {
  it.each([
    // Protocol-relative — the browser reads these as another origin.
    '//evil.com',
    '//evil.com/path',
    // Absolute URLs.
    'https://evil.com',
    'http://evil.com/path',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    // Backslash variants some browsers normalise to protocol-relative.
    '/\\evil.com',
    '/\\/evil.com',
    '/path\\to\\evil',
    // Not path-absolute.
    'home',
    'evil.com',
    '../etc/passwd',
  ])('rejects %s', (value) => {
    expect(resolvePostLoginPath(value)).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it('rejects control characters used to smuggle a scheme', () => {
    expect(resolvePostLoginPath('/\u0000//evil.com')).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(resolvePostLoginPath('/\n//evil.com')).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(resolvePostLoginPath('/\r\nLocation: x')).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });
});

describe('resolvePostLoginPath — falls back sensibly', () => {
  it.each([null, undefined, ''])('defaults when given %s', (value) => {
    expect(resolvePostLoginPath(value)).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it('avoids bouncing the user back into the login flow', () => {
    expect(resolvePostLoginPath('/continue')).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(resolvePostLoginPath('/continue?from=/home')).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(resolvePostLoginPath('/continue#top')).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(resolvePostLoginPath('/auth/google/callback')).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });
});
