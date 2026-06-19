// Nightwatch Service Worker — Workbox via CDN (no build step)
// Prevents hard reloads by caching JS chunks in Cache Storage
importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js',
);

const { registerRoute, NavigationRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, NetworkOnly } = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { ExpirationPlugin } = workbox.expiration;
const { BackgroundSyncPlugin } = workbox.backgroundSync;

// Enable navigation preload for NetworkFirst navigation routes
// (avoids SW startup delay on navigations — recommended by Workbox docs)
workbox.navigationPreload.enable();

workbox.core.skipWaiting();
workbox.core.clientsClaim();

// 1. Next.js static assets (content-hashed, immutable)
registerRoute(
  ({ url }) => url.pathname.startsWith('/_next/static/'),
  new CacheFirst({
    cacheName: 'nw-next-static',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

// 2. Static assets (images, fonts)
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' || url.pathname.endsWith('.woff2'),
  new CacheFirst({
    cacheName: 'nw-static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

// 3. Google Fonts (recipe handles both stylesheets + webfont files)
workbox.recipes.googleFontsCache();

// 4. HTML navigation requests — NetworkFirst with 3s timeout
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'nw-pages',
      networkTimeoutSeconds: 3,
    }),
    {
      denylist: [/\/api\//, /\/mp4\//],
    },
  ),
);

// 5. Background Sync — retry safe-to-retry mutations when back online
const bgSyncPlugin = new BackgroundSyncPlugin('nw-retry-queue', {
  maxRetentionTime: 60, // Retry for up to 1 hour (in minutes)
});

const SAFE_RETRY_PATTERNS = [
  /\/api\/user\/watchlist/,
  /\/api\/video\/(play|stop)/,
  /\/api\/notifications\/(register|unregister)/,
  /\/api\/manga\/progress/,
  /\/api\/music\/discover\/listen/,
  /\/api\/music\/queue$/,
  /\/api\/music\/languages/,
];

registerRoute(
  ({ url, request }) => {
    if (request.method === 'GET') return false;
    return SAFE_RETRY_PATTERNS.some((re) => re.test(url.pathname));
  },
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST',
);

registerRoute(
  ({ url, request }) => {
    if (request.method === 'GET') return false;
    return SAFE_RETRY_PATTERNS.some((re) => re.test(url.pathname));
  },
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'PUT',
);

registerRoute(
  ({ url, request }) => {
    if (request.method === 'GET') return false;
    return SAFE_RETRY_PATTERNS.some((re) => re.test(url.pathname));
  },
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'DELETE',
);

// 6. NetworkOnly for API GET, video proxy, and streaming media (no caching)
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/mp4/') ||
    /\.(m3u8|ts|mp4|webm)(\?.*)?$/.test(url.pathname),
  new NetworkOnly(),
);
