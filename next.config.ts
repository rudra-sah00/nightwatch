import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // CRITICAL: Optimize barrel imports for faster cold starts and builds
  // Per AGENTS.md 2.1: Avoid Barrel File Imports - these packages have many re-exports
  experimental: {
    optimizePackageImports: [
      'lucide-react', // 1,500+ icons, ~200-800ms import savings
      'sonner', // Toast library
      'agora-rtc-sdk-ng', // Agora WebRTC SDK
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
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
    unoptimized: false, // Enable Next.js image optimization
    formats: ['image/webp'], // Use efficient WebP format
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Common device widths
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Common image sizes
    minimumCacheTTL: 3600, // Cache images for 1 hour
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
