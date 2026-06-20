import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node-only libraries that must not be bundled by Turbopack (server-side use).
  serverExternalPackages: ["imapflow", "mailparser", "@anthropic-ai/sdk"],
};

export default nextConfig;
