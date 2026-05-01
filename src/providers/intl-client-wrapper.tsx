'use client';

import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';

/**
 * Development-only error handler that logs missing translation warnings.
 * @param error - The `next-intl` error object.
 */
function onError(error: { code: string; message: string }) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[next-intl] ${error.code}: ${error.message}`);
  }
}

/**
 * Returns a human-readable fallback key when a translation is missing.
 * Uses the leaf segment of the dot-separated key path.
 */
function getMessageFallback({
  namespace,
  key,
}: {
  namespace?: string;
  key: string;
  error: { code: string };
}) {
  const leafKey = key.split('.').pop() ?? key;
  return namespace ? `${namespace}.${leafKey}` : leafKey;
}

/**
 * Client-side wrapper around `NextIntlClientProvider`.
 *
 * Configures a custom error handler (dev-only warnings) and a fallback
 * strategy that renders the translation key path when a message is missing.
 *
 * @param props.locale - Active locale code (e.g. `'en'`, `'ja'`).
 * @param props.messages - Pre-loaded translation messages for the locale.
 */
export function IntlClientWrapper({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={onError}
      getMessageFallback={getMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
