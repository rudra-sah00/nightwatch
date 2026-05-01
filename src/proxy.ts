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
  '/changelog',
  '/watch/',
  '/live/',
  '/clip/',
];

function isProtectedRoute(pathname: string): boolean {
  // /clip/share is public
  if (pathname.startsWith('/clip/share')) return false;
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Redirect unauthenticated users away from protected routes at the edge
  // so the RSC payload is never generated, avoiding "Failed to fetch RSC" errors
  if (isProtectedRoute(pathname)) {
    const rawCookie = req.headers.get('cookie') || '';
    if (!rawCookie.includes('refreshToken=')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Check raw Cookie header to avoid triggering dynamic route behavior
  const rawCookie = req.headers.get('cookie') || '';
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
    '/((?!api/|_next/static|_next/image|logo.png|openwakeword|images).*)',
  ],
};
