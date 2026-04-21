import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { COOKIE_NAME, defaultLocale, type Locale, locales } from './config';

export default getRequestConfig(async () => {
  // Try header first (set by middleware), then cookie as fallback
  const headerStore = await headers();
  const cookieStore = await cookies();

  const headerLocale = headerStore.get('x-locale');
  const cookieLocale = cookieStore.get(COOKIE_NAME)?.value;
  const raw = headerLocale || cookieLocale;

  const locale: Locale = locales.includes(raw as Locale)
    ? (raw as Locale)
    : defaultLocale;

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`./messages/${locale}/common.json`)).default;
  } catch {
    messages = (await import('./messages/en/common.json')).default;
  }

  return { locale, messages };
});
