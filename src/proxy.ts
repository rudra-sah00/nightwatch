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

export default function proxy(req: NextRequest) {
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
    '/((?!api/|_next/static|_next/image|favicon.ico|openwakeword|images).*)',
  ],
};
