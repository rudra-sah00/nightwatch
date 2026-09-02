'use client';

import { useEffect, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';

/** Viewport width breakpoint (px) below which the hook reports mobile. */
const MOBILE_BREAKPOINT = 768;

/**
 * Detects whether the current **viewport** should be treated as mobile.
 *
 * Returns `true` when the viewport is narrower than {@link MOBILE_BREAKPOINT}
 * **or** when running inside a Capacitor native mobile shell (even on tablets).
 *
 * This is a layout breakpoint — it is `true` for a narrow desktop window, which
 * is correct for swapping navigation and grid layouts. For anything that depends
 * on the *input device* (touch gestures, tap targets, the player control skin)
 * use `useIsTouchUi` from `./use-touch-ui` instead: a narrow window on a laptop
 * is still mouse-driven.
 *
 * Hydration-safe: starts as `false` on the server and updates after mount.
 *
 * @returns `true` if the viewport is considered mobile.
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
