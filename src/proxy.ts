import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'NEXT_LOCALE';
const SUPPORTED = new Set([
  'en',
  'hi',
  'es',
  'fr',
  'ja',
  'ko',
  'de',
  'pt',
  'ar',
  'ru',
  'zh',
  'it',
  'tr',
  'th',
]);
const DEFAULT_LOCALE = 'en';

function getPreferredLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const preferred = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return {
        lang: lang.trim().toLowerCase(),
        q: q ? Number.parseFloat(q) : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of preferred) {
    if (SUPPORTED.has(lang)) return lang;
    const prefix = lang.split('-')[0];
    if (SUPPORTED.has(prefix)) return prefix;
  }
  return DEFAULT_LOCALE;
}

const PROTECTED_PREFIXES = [
  '/home',
  '/search',
  '/music',
  '/watchlist',
  '/downloads',
  '/profile',
  '/continue-watching',
  '/library',
  '/ask-ai',
  '/games',
  '/manga',
  '/watch/',
  '/live/',
  '/clip/',
];

// Routes that should redirect to /home if already authenticated
const AUTH_ROUTES = ['/login', '/signup'];

function isProtectedRoute(pathname: string): boolean {
  // /clip/share is public
  if (pathname.startsWith('/clip/share')) return false;
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rawCookie = req.headers.get('cookie') || '';
  const hasSession = rawCookie.includes('refreshToken=');

  // Redirect unauthenticated users away from protected routes at the edge
  if (isProtectedRoute(pathname) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login/signup
  if (
    AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) &&
    hasSession
  ) {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  // Locale detection: set cookie if not present
  const hasLocale = rawCookie.includes(`${COOKIE_NAME}=`);
  if (!hasLocale) {
    const locale = getPreferredLocale(req.headers.get('accept-language'));
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|logo.png|openwakeword|images|monitoring|sw.js|swe-worker).*)',
  ],
};
