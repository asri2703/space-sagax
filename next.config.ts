import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a precompiled Chromium binary inside
  // its package. Next.js's bundler tries to inline ESM source, which
  // strips the binary out of the serverless function. Mark the
  // package (and puppeteer-core) as server-external so they are
  // resolved from node_modules at runtime instead.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Standalone output bundles the .next/ output in /var/task and
  // copies node_modules alongside it. The Chromium binary lives
  // at /var/task/node_modules/@sparticuz/chromium/bin/ and is
  // accessible to the serverless function at runtime.
  output: "standalone",
};

export default nextConfig;
