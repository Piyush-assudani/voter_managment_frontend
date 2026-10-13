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
    const isDev = process.env.NODE_ENV === 'development';
    const fallbackDestination = isDev
      ? 'http://127.0.0.1:5002/api/:path*'
      : 'https://vijaysetu.piyushassudani.in/api/:path*';
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_API_URL || fallbackDestination,
      },
    ];
  }
};

export default nextConfig;
