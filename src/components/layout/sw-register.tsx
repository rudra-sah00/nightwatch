'use client';

import { useEffect } from 'react';

/**
 * Registers the Workbox service worker.
 * Since sw.js uses skipWaiting() + clientsClaim(), updates apply automatically
 * without requiring user interaction or page reload.
 */
export function SwRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      window.location.hostname === 'dev.nightwatch.in'
    )
      return;

    navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
}
