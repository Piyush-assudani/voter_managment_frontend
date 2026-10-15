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
    const defaultBackend = process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:5002/api/:path*'
      : 'https://vijaysetu.piyushassudani.in/api/:path*';
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_API_URL || defaultBackend,
      },
    ];
  }
};

export default nextConfig;
