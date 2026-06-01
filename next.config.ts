import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-auth", "@prisma/client", "kysely"],
};

export default nextConfig;
