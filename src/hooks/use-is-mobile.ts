'use client';

import { useEffect, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';

/** Viewport width breakpoint (px) below which the hook reports mobile. */
const MOBILE_BREAKPOINT = 768;

/**
 * Detects whether the current device should be treated as mobile.
 *
 * Returns `true` when the viewport is narrower than {@link MOBILE_BREAKPOINT}
 * **or** when running inside a Capacitor native mobile shell (even on tablets).
 *
 * Hydration-safe: starts as `false` on the server and updates after mount.
 *
 * @returns `true` if the device is considered mobile.
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
