import { type NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_NAME,
  defaultLocale,
  type Locale,
  locales,
} from '@/i18n/config';

export function middleware(request: NextRequest) {
  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  const headerLocale = request.headers
    .get('accept-language')
    ?.split(',')[0]
    ?.split('-')[0];

  const locale: Locale = locales.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : locales.includes(headerLocale as Locale)
      ? (headerLocale as Locale)
      : defaultLocale;

  const response = NextResponse.next();
  response.headers.set('x-locale', locale);

  if (!cookieLocale) {
    response.cookies.set(COOKIE_NAME, locale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|monitoring|sw\\.js|.*\\..*).*)'],
};
