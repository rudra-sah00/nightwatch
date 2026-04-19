/** Lightweight TTL cache. Replaces 3 duplicate implementations across watch/search/profile. */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export interface TTLCache<T> {
  get(key: string): T | undefined;
  set(key: string, data: T): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

// Registry of all caches for global invalidation on logout
const allCaches: Array<{ clear(): void }> = [];

export function createTTLCache<T>(ttlMs: number, maxSize = 100): TTLCache<T> {
  const store = new Map<string, CacheEntry<T>>();

  function cleanup() {
    if (store.size <= maxSize) return;
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiry < now) store.delete(key);
    }
  }

  const cache: TTLCache<T> = {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiry < Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.data;
    },
    set(key, data) {
      store.set(key, { data, expiry: Date.now() + ttlMs });
      cleanup();
    },
    delete(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    has(key) {
      return cache.get(key) !== undefined;
    },
  };

  allCaches.push(cache);
  return cache;
}

/** Clear every TTL cache in the app. Call on logout / session expiry. */
export function clearAllCaches(): void {
  for (const c of allCaches) c.clear();
}
