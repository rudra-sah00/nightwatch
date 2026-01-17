import type { NextConfig } from "next";

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
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`,
      },
      {
        source: '/stream/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/stream/:path*`,
      }
    ];
  },
};

export default nextConfig;
