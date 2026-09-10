import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a precompiled Chromium binary inside
  // its package. Next.js's bundler tries to inline ESM source, which
  // strips the binary out of the serverless function. Mark the
  // package (and puppeteer-core) as server-external so they are
  // resolved from node_modules at runtime instead.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
