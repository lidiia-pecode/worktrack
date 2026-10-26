import type { NextConfig } from "next";

import { BACKEND_URL } from "./lib/constants/backend-url";

const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-right" },

  experimental: {
    // A build cache Vercel restored once shipped a stale `globals.css` with
    // otherwise current code, so production builds start clean.
    turbopackFileSystemCacheForBuild: false,
  },

  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
