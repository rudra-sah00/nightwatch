'use client';

import { useEffect } from 'react';

/** Locale codes that use right-to-left text direction. */
const RTL_LOCALES = ['ar'];

/**
 * Headless client component that synchronizes the `<html>` element's `lang`
 * and `dir` attributes with the active locale.
 *
 * Sets `dir="rtl"` for Arabic and `dir="ltr"` for all other locales.
 * Renders nothing to the DOM.
 *
 * @param props.locale - The active locale code (e.g. `'en'`, `'ar'`).
 */
export function HtmlLangSetter({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}
