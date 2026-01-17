import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL}/api/:path*`,
      },
      {
        source: '/stream/:path*',
        destination: `${process.env.BACKEND_URL}/stream/:path*`,
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
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://vercel.live; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' ${process.env.BACKEND_URL || 'https://api.rudrasahoo.live'} ${process.env.BACKEND_URL ? process.env.BACKEND_URL.replace('https://', 'wss://') : 'wss://api.rudrasahoo.live'} https://vercel.live wss://*.pusher.com wss://*.vercel.live; media-src 'self' ${process.env.BACKEND_URL || 'https://api.rudrasahoo.live'} https://*.net51.cc https://*.net20.cc blob:; frame-src 'self' https://vercel.live; worker-src 'self' blob:;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
