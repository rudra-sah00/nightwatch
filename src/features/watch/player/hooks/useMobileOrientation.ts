import { useSyncExternalStore } from 'react';

const checkPortrait = () => window.innerHeight > window.innerWidth;

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange, { passive: true });
  window.addEventListener('orientationchange', onChange, { passive: true });
  return () => {
    window.removeEventListener('resize', onChange);
    window.removeEventListener('orientationchange', onChange);
  };
}

/**
 * Returns true when the device is in portrait orientation.
 * Updates on resize and orientationchange.
 *
 * `useSyncExternalStore` with a `false` server snapshot: the previous `useState`
 * initializer read `window` during hydration, so portrait clients rendered different
 * markup from the server and React reported a hydration mismatch.
 */
export function useMobileOrientation(): boolean {
  return useSyncExternalStore(subscribe, checkPortrait, () => false);
}
