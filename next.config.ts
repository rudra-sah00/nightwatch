import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'emoji-picker-react',
    ],
    cacheComponents: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/stream/image',
        search: '**',
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
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https: blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' blob: data: https: http://localhost:4000",
              "font-src 'self' data: https:",
              "connect-src 'self' wss: ws: https: http: http://localhost:4000 ws://localhost:4000",
              "frame-src 'self' https: blob: data:",
              "worker-src 'self' blob: https:",
              "media-src 'self' blob: data: https:",
              "object-src 'none'",
            ].join('; '),
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
