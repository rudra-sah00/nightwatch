'use client';

import { useEffect, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';

const MOBILE_BREAKPOINT = 768;

/**
 * Returns true when the viewport is narrower than 768px (mobile screen)
 * OR when running inside a Capacitor native mobile shell.
 * Hydration-safe: starts as false on the server and updates after mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Always true inside Capacitor native app (even on tablets)
    if (checkIsMobile()) {
      setIsMobile(true);
      return;
    }
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
