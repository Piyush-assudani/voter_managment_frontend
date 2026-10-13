import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
