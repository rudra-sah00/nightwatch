import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { COOKIE_NAME, defaultLocale, type Locale, locales } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const locale: Locale = locales.includes(raw as Locale)
    ? (raw as Locale)
    : defaultLocale;

  let common: Record<string, unknown>;
  try {
    common = (await import(`./messages/${locale}/common.json`)).default;
  } catch {
    common = (await import('./messages/en/common.json')).default;
  }

  let authMessages: Record<string, unknown> = {};
  try {
    authMessages = (await import(`./messages/${locale}/auth.json`)).default;
  } catch {}

  let profileMessages: Record<string, unknown> = {};
  try {
    profileMessages = (await import(`./messages/${locale}/profile.json`))
      .default;
  } catch {}

  const messages = { ...common, auth: authMessages, profile: profileMessages };

  return { locale, messages };
});
