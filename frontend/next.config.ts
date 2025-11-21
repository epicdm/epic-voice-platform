import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even with TypeScript errors (use cautiously)
    ignoreBuildErrors: true,
  },
  // Configure cache headers to prevent aggressive browser caching
  async headers() {
    return [
      {
        // Prevent caching of HTML pages
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'accept',
            value: '(.*text/html.*)',
          },
        ],
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // Allow static assets with hashes to cache forever
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
