import type { NextConfig } from "next";

import { BACKEND_URL } from "./lib/constants/backend-url";

// Reset, invitation and Google links carry a one-time token in the URL, so
// Referrer-Policy keeps the full URL from leaving the site. The backend sends
// the same set (create-app.ts).
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-right" },
  poweredByHeader: false,

  experimental: {
    // Turbopack's file-system cache has served a stale `globals.css` with
    // otherwise current code, once in a Vercel build and once in local dev,
    // so both start clean.
    turbopackFileSystemCacheForBuild: false,
    turbopackFileSystemCacheForDev: false,
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
