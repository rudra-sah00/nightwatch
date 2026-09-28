import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import proxy, { config } from '@/proxy';

const ORIGIN = 'https://nightwatch.in';

function request(path: string, opts: { session?: boolean } = {}) {
  const req = new NextRequest(new URL(path, ORIGIN));
  if (opts.session) {
    req.cookies.set('refreshToken', 'a-refresh-token');
  }
  return req;
}

/** Extracts the Location header of a redirect response. */
function redirectTarget(res: Response): URL | null {
  const location = res.headers.get('location');
  return location ? new URL(location, ORIGIN) : null;
}

describe('proxy — signed-out visitors', () => {
  const protectedPaths = [
    '/home',
    '/watch/abc123',
    '/live/xyz',
    '/clip/abc',
    '/games',
    '/games/some-game',
    '/music',
    '/music/album/1',
    '/manga',
    '/manga/title/42',
    '/watchlist',
    '/profile',
    '/profile/security',
    '/profile/preferences/notifications',
    '/search',
    '/library',
    '/continue-watching',
    '/ask-ai',
    '/content/9',
  ];

  it.each(protectedPaths)('redirects %s to the login page', (path) => {
    const res = proxy(request(path));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)?.pathname).toBe('/continue');
  });

  it('preserves the intended destination in ?from', () => {
    const res = proxy(request('/watch/abc123?t=42'));
    const target = redirectTarget(res);
    expect(target?.pathname).toBe('/continue');
    expect(target?.searchParams.get('from')).toBe('/watch/abc123?t=42');
  });

  it('protects unknown routes by default', () => {
    // Deny-by-default: a route nobody remembered to list is still guarded.
    const res = proxy(request('/some-future-feature'));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)?.pathname).toBe('/continue');
  });
});

describe('proxy — public paths', () => {
  const publicPaths = [
    '/',
    '/continue',
    '/privacy',
    '/terms',
    '/auth/google/callback',
    '/clip/share/some-share-id',
    // Public profiles are shareable links; the backend endpoint takes no auth.
    '/user/019cb3fa-3af6-7641-a730-08212f8e514a',
    // The (party) layout explicitly allows guests.
    '/watch-party/room-1',
  ];

  it.each(publicPaths)('allows %s without a session', (path) => {
    const res = proxy(request(path));
    expect(res.headers.get('location')).toBeNull();
  });

  it('keeps /clip/share public while /clip/:id stays protected', () => {
    expect(
      proxy(request('/clip/share/abc')).headers.get('location'),
    ).toBeNull();
    expect(proxy(request('/clip/abc')).status).toBe(307);
  });

  /**
   * A shared profile link has to open for someone with no account. This used to redirect to
   * `/continue?from=/user/...`, which made every shared profile URL a login wall even though
   * `GET /api/user/public/:id` takes no auth at all.
   */
  it('keeps /user/:id public while /profile stays protected', () => {
    expect(proxy(request('/user/abc')).headers.get('location')).toBeNull();
    expect(proxy(request('/profile')).status).toBe(307);
    expect(proxy(request('/profile/security')).status).toBe(307);
  });
});

describe('proxy — signed-in visitors', () => {
  it('allows protected routes through', () => {
    const res = proxy(request('/home', { session: true }));
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects away from the login page to home', () => {
    const res = proxy(request('/continue', { session: true }));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)?.pathname).toBe('/home');
  });

  it('still allows the marketing landing page', () => {
    const res = proxy(request('/', { session: true }));
    expect(res.headers.get('location')).toBeNull();
  });

  it('treats an empty cookie value as no session', () => {
    const req = new NextRequest(new URL('/home', ORIGIN));
    req.cookies.set('refreshToken', '');
    expect(proxy(req).status).toBe(307);
  });

  it('ignores accessToken on its own', () => {
    // accessToken expires every 15 minutes, so it must not be the signal.
    const req = new NextRequest(new URL('/home', ORIGIN));
    req.cookies.set('accessToken', 'short-lived');
    expect(proxy(req).status).toBe(307);
  });
});

describe('proxy — matcher', () => {
  const pattern = new RegExp(`${config.matcher[0].replace(/^\/\(/, '^/(')}$`);

  const shouldRun = ['/home', '/profile/security', '/'];
  const shouldSkip = [
    '/api/auth/refresh',
    '/_next/static/chunk.js',
    '/sw.js',
    '/firebase-messaging-sw.js',
    '/manifest.json',
    '/logo.png',
    '/favicon.ico',
    '/incoming-call.mp3',
    '/audio-player-processor.js',
  ];

  it.each(shouldRun)('runs on %s', (path) => {
    expect(pattern.test(path)).toBe(true);
  });

  it.each(shouldSkip)('skips %s', (path) => {
    expect(pattern.test(path)).toBe(false);
  });
});
