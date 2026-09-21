'use client';

import { useEffect } from 'react';

/** Caches created by `public/sw.js`. All are safe to drop and repopulate. */
const OWNED_CACHE_PREFIX = 'nw-';

/**
 * Registers the Workbox service worker — in production only.
 *
 * Since sw.js uses skipWaiting() + clientsClaim(), updates apply automatically
 * without requiring user interaction or page reload.
 *
 * IT MUST NOT RUN IN DEVELOPMENT. sw.js rule 1 puts `CacheFirst` on
 * `/_next/static/`, which is correct in production because those filenames are
 * content-hashed and immutable — but Turbopack reuses dev chunk URLs across
 * rebuilds. The service worker therefore keeps serving a chunk it cached earlier,
 * and the page explodes with
 *
 *   Module .../next@<old version>/dist/build/polyfills/process.js was
 *   instantiated because it was required from module ..., but the module factory
 *   is not available.
 *
 * pointing at a `node_modules/.pnpm/next@…` path that no longer exists, because
 * the cached chunk predates a dependency upgrade. Clearing `.next` does not help:
 * the stale copy is in Cache Storage, not the build output.
 *
 * The guard previously only excluded the `dev.nightwatch.in` preview host, so
 * every localhost dev session was affected.
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator))
      return;

    const isDevBuild = process.env.NODE_ENV === 'development';
    const isPreviewHost = window.location.hostname === 'dev.nightwatch.in';

    if (isDevBuild || isPreviewHost) {
      // Actively tear down anything registered by an earlier session. Without
      // this, a browser already holding a poisoned cache stays broken until
      // someone clears it by hand in DevTools.
      void unregisterOwnWorker();
      return;
    }

    navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
}

/**
 * Remove our Workbox worker and its caches.
 *
 * Only ours: `firebase-messaging-sw.js` is registered separately for push
 * notifications, and unregistering every worker on the origin would silently
 * break it.
 */
async function unregisterOwnWorker(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => {
          const script =
            registration.active?.scriptURL ??
            registration.waiting?.scriptURL ??
            registration.installing?.scriptURL ??
            '';
          return script.endsWith('/sw.js');
        })
        .map((registration) => registration.unregister()),
    );

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(OWNED_CACHE_PREFIX))
          .map((key) => caches.delete(key)),
      );
    }
  } catch {
    // Best effort. A browser that refuses to enumerate registrations is no
    // worse off than before, and this must never break rendering.
  }
}
