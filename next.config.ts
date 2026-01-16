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
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/api/:path*`
          : 'http://localhost:8080/api/:path*',
      },
      {
        source: '/socket/:path*',
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/socket/:path*`
          : 'http://localhost:8080/socket/:path*',
      }
    ];
  },
};

export default nextConfig;
