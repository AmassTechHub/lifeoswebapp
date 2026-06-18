import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-auth", "@prisma/client", "kysely", "pdf-parse"],
  experimental: {
    // Disable the client router cache's stale window for dynamic (per-user) pages.
    // Without this, switching accounts in the same browser tab can serve a
    // previously-cached page (courses, materials, dashboard data) from the
    // PREVIOUS user's session for up to 30s — a real cross-account data leak.
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
