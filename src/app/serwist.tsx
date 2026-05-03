'use client';

import { SerwistProvider as BaseSerwistProvider } from '@serwist/next/react';

export function SerwistProvider({
  children,
  swUrl,
}: {
  children: React.ReactNode;
  swUrl: string;
}) {
  // SW is enabled in both browser and Electron. It caches the app shell
  // so pages like /downloads work offline. Navigation uses NetworkOnly
  // with /offline.html fallback, so the SW never interferes with normal
  // loading — it only serves cached assets when the network is down.
  const isBot =
    typeof navigator !== 'undefined' &&
    /bot|crawl|spider|slurp|facebookexternalhit|bingpreview/i.test(
      navigator.userAgent,
    );

  return (
    <BaseSerwistProvider swUrl={swUrl} disable={isBot}>
      {children}
    </BaseSerwistProvider>
  );
}
