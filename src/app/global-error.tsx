'use client';

import NextError from 'next/error';
import { useEffect, useState } from 'react';
import './globals.css';

function getLocaleFromCookie(): string {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
  return match?.[1] || 'en';
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    setLocale(getLocaleFromCookie());
    import('@/lib/analytics').then(({ reportCatchError }) =>
      reportCatchError(error),
    );
  }, [error]);

  return (
    <html lang={locale}>
      <body className="bg-background text-foreground">
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
