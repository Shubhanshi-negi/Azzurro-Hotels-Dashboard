import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.VERCEL === "1") return [];

    const apiBase = process.env.API_INTERNAL_URL || "http://localhost:4000/api";
    return [{ source: "/api/:path*", destination: `${apiBase}/:path*` }];
  },
};

export default nextConfig;
