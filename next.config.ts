import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable React Strict Mode to prevent double-invocation of effects in dev.
  // Strict Mode mounts every component twice, causing duplicate API calls and
  // session conflicts (e.g. stream:revoked on S2 playback).
  reactStrictMode: false,
  // CRITICAL: Optimize barrel imports for faster cold starts and builds
  // Per AGENTS.md 2.1: Avoid Barrel File Imports - these packages have many re-exports
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'sonner',
      'agora-rtc-sdk-ng',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-slot',
      '@radix-ui/react-label',
      '@radix-ui/react-alert-dialog',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'emoji-picker-react',
    ],
  },
  cacheComponents: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    remotePatterns: [
      {
        // WARNING: Wildcard hostname allows Next.js image optimization to fetch
        // from any HTTPS domain. Required because content CDN hostnames vary
        // across providers (TMDB, MovieBox, etc.). If a fixed set of CDN domains
        // becomes known, replace this with explicit entries to eliminate
        // the image-proxy SSRF surface.
        protocol: 'https',
        hostname: '**',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/stream/image',
      },
    ],
    unoptimized: false,
    formats: ['image/webp'],
    deviceSizes: [640, 1080, 1920], // Focused breakpoints for standard devices
    imageSizes: [32, 64, 128, 256, 384],
    minimumCacheTTL: 86400, // Extend cache to 24 hours for production stability
  },
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
  async headers() {
    // Use the configured backend URL so localhost is never hardcoded in
    // production CSP headers (localhost is harmless in prod but noisy).
    const backendOrigin =
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    // CF Worker origin — localhost:8787 in dev, cdn.rudrasahoo.live in prod
    const cfWorkerOrigin = process.env.NEXT_PUBLIC_CF_WORKER_URL || '';

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https: blob: https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https:",
              `img-src 'self' blob: data: https: ${backendOrigin}`,
              "font-src 'self' data: https:",
              `connect-src 'self' data: wss: ws: https: http: ${backendOrigin} ${backendOrigin.replace('http', 'ws')} https://challenges.cloudflare.com`,
              "frame-src 'self' https: blob: data: about: https://challenges.cloudflare.com",
              "worker-src 'self' blob: https:",
              `media-src 'self' blob: data: https: ${backendOrigin}${cfWorkerOrigin ? ` ${cfWorkerOrigin}` : ''}`,
              "object-src 'none'",
              // Prevent this page from being embedded in external iframes (clickjacking)
              "frame-ancestors 'self'",
            ].join('; '),
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Prevent browsers from MIME-sniffing a response away from the declared content-type
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Belt-and-suspenders clickjacking protection alongside frame-ancestors in CSP
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            // Restrict camera/microphone/geolocation to same-origin by default.
            // Agora voice/video calls are allowed on the same origin — no external embeds needed.
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'personal-oew',

  project: 'watch-rudra-web',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
