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
 * Currently disabled - will be re-enabled later
 */
export function useDevToolsProtection() {
  useEffect(() => {
    // Temporarily disabled - no DevTools protection
    // All protection code commented out for development/debugging
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
