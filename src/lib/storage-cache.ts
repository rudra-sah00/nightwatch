/**
 * localStorage Cache
 *
 * PERFORMANCE: Caches localStorage reads in memory to avoid expensive synchronous I/O.
 * Reference: Vercel React Best Practices - Section 7.5
 *
 * Impact: LOW-MEDIUM (reduces expensive I/O operations)
 */

const storageCache = new Map<string, string | null>();

/**
 * Get value from localStorage with memory caching
 */
export function getCachedLocalStorage(key: string): string | null {
  if (!storageCache.has(key)) {
    try {
      storageCache.set(key, localStorage.getItem(key));
    } catch {
      // localStorage unavailable (SSR, incognito mode, quota exceeded)
      return null;
    }
  }
  return storageCache.get(key) ?? null;
}

/**
 * Set value in localStorage and update cache
 */
export function setCachedLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    storageCache.set(key, value);
  } catch {
    // localStorage unavailable - fail silently
  }
}

/**
 * Remove value from localStorage and cache
 */
export function removeCachedLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
    storageCache.delete(key);
  } catch {
    // localStorage unavailable - fail silently
  }
}

/**
 * Clear entire cache (use when storage changes externally)
 */
export function clearStorageCache(): void {
  storageCache.clear();
}

/**
 * Initialize storage cache event listeners.
 * Call once from a client-side component/provider to avoid SSR side effects.
 */
let _initialized = false;
export function initStorageCache(): void {
  if (_initialized || typeof window === 'undefined') return;
  _initialized = true;

  window.addEventListener('storage', (e) => {
    if (e.key) {
      storageCache.delete(e.key);
    } else {
      storageCache.clear();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      storageCache.clear();
    }
  });
}
