import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { COOKIE_NAME, defaultLocale, type Locale, locales } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const locale: Locale = locales.includes(raw as Locale)
    ? (raw as Locale)
    : defaultLocale;

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`./messages/${locale}/common.json`)).default;
  } catch {
    // Fallback to English if translation file doesn't exist yet
    messages = (await import('./messages/en/common.json')).default;
  }

  return { locale, messages };
});
