'use client';

import { SerwistProvider as BaseSerwistProvider } from '@serwist/next/react';

export function SerwistProvider({
  children,
  swUrl,
}: {
  children: React.ReactNode;
  swUrl: string;
}) {
  // Skip service worker in Electron — not needed and causes evaluation errors
  if (
    typeof navigator !== 'undefined' &&
    navigator.userAgent.includes('Electron')
  ) {
    return <>{children}</>;
  }
  return <BaseSerwistProvider swUrl={swUrl}>{children}</BaseSerwistProvider>;
}
