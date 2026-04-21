export const locales = [
  'en',
  'hi',
  'ta',
  'te',
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
] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const COOKIE_NAME = 'NEXT_LOCALE';
