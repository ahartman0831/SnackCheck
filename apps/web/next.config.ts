import type { NextConfig } from "next";
import { SECURITY_RESPONSE_HEADERS } from "./lib/security/response-headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@snackcheck/compliance",
    "@snackcheck/contracts",
    "@snackcheck/db-types",
  ],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...SECURITY_RESPONSE_HEADERS],
      },
    ];
  },
};

export default nextConfig;
