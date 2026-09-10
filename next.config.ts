import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // We host the Saga X Space brand at space.sagaxventures.com.
  // Keep this app isolated — no rewrites, no proxies, no shared
  // middleware with the parent sagaxventures.com project.
};

export default nextConfig;
