import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { COOKIE_NAME, defaultLocale, type Locale, locales } from './config';

// Static import map — ensures all locale files are included in the Vercel build bundle.
// Dynamic import(`./messages/${locale}/...`) fails on edge/serverless because the bundler
// can't resolve template-literal paths at build time.
const messageImports: Record<
  string,
  () => Promise<{ default: Record<string, unknown> }>[]
> = {
  en: () => [
    import('./messages/en/common.json'),
    import('./messages/en/auth.json'),
    import('./messages/en/profile.json'),
    import('./messages/en/search.json'),
    import('./messages/en/watch.json'),
    import('./messages/en/live.json'),
    import('./messages/en/party.json'),
  ],
  hi: () => [
    import('./messages/hi/common.json'),
    import('./messages/hi/auth.json'),
    import('./messages/hi/profile.json'),
    import('./messages/hi/search.json'),
    import('./messages/hi/watch.json'),
    import('./messages/hi/live.json'),
    import('./messages/hi/party.json'),
  ],
  es: () => [
    import('./messages/es/common.json'),
    import('./messages/es/auth.json'),
    import('./messages/es/profile.json'),
    import('./messages/es/search.json'),
    import('./messages/es/watch.json'),
    import('./messages/es/live.json'),
    import('./messages/es/party.json'),
  ],
  fr: () => [
    import('./messages/fr/common.json'),
    import('./messages/fr/auth.json'),
    import('./messages/fr/profile.json'),
    import('./messages/fr/search.json'),
    import('./messages/fr/watch.json'),
    import('./messages/fr/live.json'),
    import('./messages/fr/party.json'),
  ],
  ja: () => [
    import('./messages/ja/common.json'),
    import('./messages/ja/auth.json'),
    import('./messages/ja/profile.json'),
    import('./messages/ja/search.json'),
    import('./messages/ja/watch.json'),
    import('./messages/ja/live.json'),
    import('./messages/ja/party.json'),
  ],
  ko: () => [
    import('./messages/ko/common.json'),
    import('./messages/ko/auth.json'),
    import('./messages/ko/profile.json'),
    import('./messages/ko/search.json'),
    import('./messages/ko/watch.json'),
    import('./messages/ko/live.json'),
    import('./messages/ko/party.json'),
  ],
  de: () => [
    import('./messages/de/common.json'),
    import('./messages/de/auth.json'),
    import('./messages/de/profile.json'),
    import('./messages/de/search.json'),
    import('./messages/de/watch.json'),
    import('./messages/de/live.json'),
    import('./messages/de/party.json'),
  ],
  pt: () => [
    import('./messages/pt/common.json'),
    import('./messages/pt/auth.json'),
    import('./messages/pt/profile.json'),
    import('./messages/pt/search.json'),
    import('./messages/pt/watch.json'),
    import('./messages/pt/live.json'),
    import('./messages/pt/party.json'),
  ],
  ar: () => [
    import('./messages/ar/common.json'),
    import('./messages/ar/auth.json'),
    import('./messages/ar/profile.json'),
    import('./messages/ar/search.json'),
    import('./messages/ar/watch.json'),
    import('./messages/ar/live.json'),
    import('./messages/ar/party.json'),
  ],
  ru: () => [
    import('./messages/ru/common.json'),
    import('./messages/ru/auth.json'),
    import('./messages/ru/profile.json'),
    import('./messages/ru/search.json'),
    import('./messages/ru/watch.json'),
    import('./messages/ru/live.json'),
    import('./messages/ru/party.json'),
  ],
  zh: () => [
    import('./messages/zh/common.json'),
    import('./messages/zh/auth.json'),
    import('./messages/zh/profile.json'),
    import('./messages/zh/search.json'),
    import('./messages/zh/watch.json'),
    import('./messages/zh/live.json'),
    import('./messages/zh/party.json'),
  ],
  it: () => [
    import('./messages/it/common.json'),
    import('./messages/it/auth.json'),
    import('./messages/it/profile.json'),
    import('./messages/it/search.json'),
    import('./messages/it/watch.json'),
    import('./messages/it/live.json'),
    import('./messages/it/party.json'),
  ],
  tr: () => [
    import('./messages/tr/common.json'),
    import('./messages/tr/auth.json'),
    import('./messages/tr/profile.json'),
    import('./messages/tr/search.json'),
    import('./messages/tr/watch.json'),
    import('./messages/tr/live.json'),
    import('./messages/tr/party.json'),
  ],
  th: () => [
    import('./messages/th/common.json'),
    import('./messages/th/auth.json'),
    import('./messages/th/profile.json'),
    import('./messages/th/search.json'),
    import('./messages/th/watch.json'),
    import('./messages/th/live.json'),
    import('./messages/th/party.json'),
  ],
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const locale: Locale = locales.includes(raw as Locale)
    ? (raw as Locale)
    : defaultLocale;

  const loader = messageImports[locale] || messageImports.en;
  const [common, auth, profile, search, watch, live, party] = await Promise.all(
    loader(),
  );

  return {
    locale,
    messages: {
      common: common.default,
      auth: auth.default,
      profile: profile.default,
      search: search.default,
      watch: watch.default,
      live: live.default,
      party: party.default,
    },
  };
});
