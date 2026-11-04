import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel Free Tier limits (zero image transformation charges, minimal bandwidth & edge caching)
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    proxyClientMaxBodySize: '100mb',
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // @ts-ignore Next.js security agent upgrade flag
    agentUpgrade: 'security',
  },
  async headers() {
    return [
      {
        // Cache immutable static build assets (JS chunks, CSS) for 1 year on Vercel CDN
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache icons, favicon, manifest on CDN to prevent function invocations
        source: '/(icon.*|favicon.ico|manifest.json)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const liveDestination = 'https://vijaysetu.piyushassudani.in/api/:path*';
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_API_URL || liveDestination,
      },
    ];
  }
};

export default nextConfig;
