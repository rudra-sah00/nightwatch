'use client';

import { useEffect, useState } from 'react';
import { setCrashNetworkState } from '@/lib/crash-context';

/**
 * Tracks the browser's online/offline connectivity state.
 *
 * Listens to the `online` and `offline` window events and exposes a reactive
 * `isOffline` boolean. The `mounted` flag indicates whether the client-side
 * effect has run (useful for avoiding hydration mismatches).
 *
 * @returns `{ isOffline, mounted }` — `isOffline` is `true` when the browser
 *          reports no network; `mounted` is `true` after the first client render.
 */
export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOffline(!window.navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setCrashNetworkState('offline');
    };
    const handleOnline = () => {
      setIsOffline(false);
      setCrashNetworkState('online');
    };

    setCrashNetworkState(window.navigator.onLine ? 'online' : 'offline');

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { isOffline, mounted };
}
