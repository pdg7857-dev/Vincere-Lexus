import type { NextConfig } from "next";

// Remote access (Tailscale): hostnames allowed to reach the app from your private
// tailnet — e.g. your Mac's MagicDNS name "macmini.tailXXXX.ts.net". Set
// REMOTE_HOSTNAMES (comma-separated) in .env. The app still binds to localhost;
// Tailscale Serve proxies it in over the encrypted tailnet. These entries let
// Next accept those requests: `allowedDevOrigins` for dev-server assets, and
// `serverActions.allowedOrigins` so form posts / login (Server Actions) aren't
// rejected as cross-origin. Empty by default = localhost only.
const remoteHosts = (process.env.REMOTE_HOSTNAMES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Node-only libraries that must not be bundled by Turbopack (server-side use).
  serverExternalPackages: ["imapflow", "mailparser", "@anthropic-ai/sdk"],
  ...(remoteHosts.length > 0
    ? {
        allowedDevOrigins: remoteHosts,
        experimental: { serverActions: { allowedOrigins: remoteHosts } },
      }
    : {}),
};

export default nextConfig;
