import type { NextConfig } from "next";

import { BACKEND_URL } from "./lib/constants/backend-url";

const nextConfig: NextConfig = {
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
