import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // CRITICAL: Optimize barrel imports for lucide-react (40% faster cold starts)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    unoptimized: false, // Enable Next.js image optimization
    formats: ['image/webp'], // Use efficient WebP format
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Common device widths
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Common image sizes
    minimumCacheTTL: 3600, // Cache images for 1 hour
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
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
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' blob: data: https: http:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' ws: wss: https: http:",
              "frame-src 'self' https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "media-src 'self' blob: data: https: http:",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
