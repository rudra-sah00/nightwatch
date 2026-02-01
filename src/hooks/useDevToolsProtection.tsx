'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    Firebug?: { chrome?: { isInitialized: boolean } };
  }
}

const _REDIRECT_URL = 'https://rudrasahoo.live';

/**
 * DevTools Protection Hook
 * Detects various methods of opening DevTools and redirects
 * Currently disabled for debugging
 */
export function useDevToolsProtection() {
  useEffect(() => {
    // Temporarily disabled for debugging LiveKit issues
  }, []);
}

/**
 * DevTools Protection Provider Component
 * Wrap your app with this component to enable protection
 * Currently disabled
 */
export function DevToolsProtection({
  children,
}: {
  children: React.ReactNode;
}) {
  useDevToolsProtection();
  return <>{children}</>;
}
