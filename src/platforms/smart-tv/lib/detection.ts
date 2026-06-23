/**
 * Smart TV platform detection.
 * The native Android TV MainActivity injects `window.__ANDROID_TV__ = true`
 * via WebViewClient.onPageStarted — guaranteed to run before any page JS.
 * localStorage persists across sessions so detection is instant after first launch.
 *
 * For browser testing: run `localStorage.setItem('__ANDROID_TV__', 'true')` then reload.
 */
export function isTV(): boolean {
  if (typeof window === 'undefined') return false;
  // localStorage check first (instant, persisted from previous sessions)
  if (localStorage.getItem('__ANDROID_TV__') === 'true') return true;
  // Window flag (set by native before page JS via onPageStarted)
  return window.__ANDROID_TV__ === true;
}

/** Detect LG webOS TV via user-agent. */
export function isWebOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /web0s|webos/i.test(navigator.userAgent);
}

/** Detect Samsung Tizen TV via user-agent. */
export function isTizen(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /tizen/i.test(navigator.userAgent);
}

/**
 * Returns a promise that resolves `true` if running on TV.
 * With onPageStarted injection, the flag should be available immediately.
 * Short poll as safety net for edge cases.
 */
export function waitForTvFlag(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (isTV()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let tries = 0;
    const interval = setInterval(() => {
      if (isTV()) {
        clearInterval(interval);
        resolve(true);
      }
      if (++tries >= 10) {
        clearInterval(interval);
        resolve(false);
      }
    }, 30);
  });
}
