/**
 * Smart TV platform detection.
 * The native Android TV MainActivity injects `window.__ANDROID_TV__ = true`.
 *
 * For browser testing: run `localStorage.setItem('__ANDROID_TV__', 'true')` then reload.
 */
export function isTV(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.__ANDROID_TV__ === true) return true;
  // Fallback for browser testing (localStorage persists across reloads)
  return localStorage.getItem('__ANDROID_TV__') === 'true';
}

/**
 * Returns a promise that resolves `true` if running on TV.
 * Waits up to 300ms for the native flag to appear.
 */
export function waitForTvFlag(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (isTV()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let tries = 0;
    const interval = setInterval(() => {
      if (window.__ANDROID_TV__ === true) {
        clearInterval(interval);
        resolve(true);
      }
      if (++tries >= 15) {
        clearInterval(interval);
        resolve(false);
      }
    }, 20);
  });
}
