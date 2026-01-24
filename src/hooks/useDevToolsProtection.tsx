'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    Firebug?: { chrome?: { isInitialized: boolean } };
  }
}

const REDIRECT_URL = 'https://rudrasahoo.live';

/**
 * DevTools Protection Hook
 * Detects various methods of opening DevTools and redirects
 * Only active in production mode
 */
export function useDevToolsProtection() {
  useEffect(() => {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // TEMPORARY DISABLE FOR DEPLOYMENT
    return;

    /* TEMPORARY DISABLE
    const redirect = () => {
      window.location.href = REDIRECT_URL;
    };

    // ... (rest of the code) ...
    // Cleanup
    return () => {
      clearInterval(sizeCheckInterval);
      clearInterval(consoleCheckInterval);
      clearInterval(firebugCheckInterval);
      window.removeEventListener('keydown', blockKeyboardShortcuts);
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('dragstart', blockDrag);
      window.removeEventListener('resize', checkDevToolsSize);

      // Remove injected styles
      const styleEl = document.getElementById(styleId);
      if (styleEl) {
        styleEl.remove();
      }
    };
    */
  }, []);
}

/**
 * DevTools Protection Provider Component
 * Wrap your app with this component to enable protection
 */
export function DevToolsProtection({
  children,
}: {
  children: React.ReactNode;
}) {
  useDevToolsProtection();
  return <>{children}</>;
}
