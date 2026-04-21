export const locales = ['en', 'hi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const COOKIE_NAME = 'NEXT_LOCALE';
