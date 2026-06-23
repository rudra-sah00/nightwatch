/**
 * Smart TV platform detection.
 * The native Android TV MainActivity injects `window.__ANDROID_TV__ = true`.
 * webOS LG TVs are detected via user-agent string.
 *
 * For browser testing: run `localStorage.setItem('__ANDROID_TV__', 'true')` then reload.
 */
export function isTV(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.__ANDROID_TV__ === true) return true;
  if (localStorage.getItem('__ANDROID_TV__') === 'true') return true;
  return isWebOS() || isTizen();
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
