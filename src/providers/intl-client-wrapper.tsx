'use client';

import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';

function onError(error: { code: string; message: string }) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[next-intl] ${error.code}: ${error.message}`);
  }
}

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
