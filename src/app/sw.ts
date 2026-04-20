import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkFirst, NetworkOnly, Serwist } from 'serwist';

// Extend the Service Worker global scope with the Serwist manifest injected at build time
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

// Runtime caching rules that must run BEFORE defaultCache.
// defaultCache has a CacheFirst rule for *.mp4 and *.webm which would try to
// cache entire streaming video files — causing blank screens on S2 (MP4) streams.
// We intercept all video/HLS streaming requests and pass them straight to the network.
const streamingPassthrough = [
  // S2 MP4 streams served via the backend proxy
  {
    matcher: /\/api\/stream\//i,
    handler: new NetworkOnly(),
  },
  // HLS manifests and segments (any origin)
  {
    matcher: /\.(m3u8|ts)(\?.*)?$/i,
    handler: new NetworkOnly(),
  },
  // MP4/WebM video files fetched directly (e.g. S2 direct CDN links)
  {
    matcher: /\.(mp4|webm)(\?.*)?$/i,
    handler: new NetworkOnly(),
  },
];

// Pages and RSC payloads: always fetch fresh from network, fall back to cache
// when offline. This prevents stale HTML/JS after deployments.
const navigationRules = [
  {
    matcher({ request }: { request: Request }) {
      return request.destination === 'document';
    },
    handler: new NetworkFirst({ networkTimeoutSeconds: 2 }),
  },
  {
    matcher({ request }: { request: Request }) {
      return request.headers.get('RSC') === '1';
    },
    handler: new NetworkFirst({ networkTimeoutSeconds: 2 }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: '/offline.html',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
  runtimeCaching: [
    ...streamingPassthrough,
    ...navigationRules,
    ...defaultCache,
  ],
});

serwist.addEventListeners();
