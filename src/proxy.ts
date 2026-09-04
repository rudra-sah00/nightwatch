import { type NextRequest, NextResponse } from 'next/server';

/**
 * Server-side route guard.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy`, and the
 * exported function from `middleware` to a default export named `proxy`.
 * See https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * This performs an *optimistic* check only: it reads the session cookie and
 * never calls the backend. The proxy runs on every matched request including
 * prefetches, so a network round-trip here would be a per-navigation cost.
 * Real authorization stays where the data is — the backend validates every
 * `/api` call, and `apiFetch()` handles 401s and token refresh.
 *
 * The point of this file is that an unauthenticated visitor never renders the
 * app shell at all. The client-side check in `AuthProvider` deliberately does
 * not log out on network errors or 5xx (the session may still be valid), which
 * means it cannot be the thing that keeps signed-out users out of the app.
 */

/**
 * Cookie proving a session exists.
 *
 * `accessToken` is deliberately not used — it expires every 15 minutes, so its
 * absence does not mean the user is signed out. `refreshToken` is the durable
 * signal and is HttpOnly, so it cannot be forged from client-side JS.
 */
const SESSION_COOKIE = 'refreshToken';

/** Where signed-out visitors are sent. */
const LOGIN_PATH = '/continue';

/** Where signed-in visitors go when they hit the login page. */
const HOME_PATH = '/home';

/**
 * Exact paths that never require a session.
 *
 * Everything not listed here (or matched by {@link PUBLIC_PREFIXES}) is
 * protected. Deny-by-default means a newly added route is guarded unless
 * someone explicitly opts it out, rather than silently shipping unprotected.
 */
const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  '/', // marketing landing page
  LOGIN_PATH,
  '/privacy',
  '/terms',
]);

/** Path prefixes that never require a session. */
const PUBLIC_PREFIXES: readonly string[] = [
  '/auth/', // OAuth callbacks — the session does not exist yet mid-handshake
  '/clip/share/', // publicly shareable clip links
  '/watch-party/', // the (party) layout intentionally allows guests
];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export default function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Signed-in users have no reason to see the login page.
  if (hasSession && pathname === LOGIN_PATH) {
    return NextResponse.redirect(new URL(HOME_PATH, request.nextUrl));
  }

  if (hasSession || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Preserve the intended destination so login can return the user to it.
  // Read back by ContinueClient, which re-validates it before navigating.
  const loginUrl = new URL(LOGIN_PATH, request.nextUrl);
  loginUrl.searchParams.set('from', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  /**
   * Skip `/api` (the backend authorizes those itself), Next internals, and any
   * path with a file extension — this keeps `sw.js`, `firebase-messaging-sw.js`,
   * `manifest.json`, audio assets and icons in `public/` reachable while signed
   * out, which service worker and PWA installation both require.
   */
  matcher: ['/((?!api|_next|.*\\.[\\w]+$).*)'],
};
