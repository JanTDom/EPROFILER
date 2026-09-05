import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development" && !process.env.VERCEL;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (isDev) {
      return [
        {
          source: "/backend-api/:path*",
          destination: "http://localhost:8000/api/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
