// One-command remote access: detect this machine's Tailscale name, write it into
// .env as REMOTE_HOSTNAMES, and share the app over your tailnet via Tailscale
// Serve. Run ON THE MACHINE that hosts the CRM:  npm run go-remote
//
// Then (re)start the app so Next picks up REMOTE_HOSTNAMES:  npm run dev
// ...and open https://<your-machine>.ts.net on your phone (Tailscale on).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";

const PORT = process.env.PORT || "3000";
const ENV_PATH = path.join(process.cwd(), ".env");
const EXAMPLE_PATH = path.join(process.cwd(), ".env.example");

// Tailscale CLI: PATH on macOS/Linux, default install path on Windows.
const TS_CANDIDATES = [
  "tailscale",
  "C:\\Program Files\\Tailscale\\tailscale.exe",
  "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
];

function tailscale(args: string[]): string {
  let lastErr: unknown;
  for (const bin of TS_CANDIDATES) {
    try {
      return execFileSync(bin, args, { encoding: "utf8" });
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `couldn't run the Tailscale CLI. Is Tailscale installed and is \`tailscale up\` done?\n  (${(lastErr as Error)?.message ?? "not found"})`,
  );
}

function die(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// 1. This machine's MagicDNS name (strip the trailing dot).
let dns = "";
try {
  const status = JSON.parse(tailscale(["status", "--json"]));
  dns = String(status?.Self?.DNSName ?? "").replace(/\.$/, "");
} catch (e) {
  die((e as Error).message);
}
if (!dns) {
  die(
    "couldn't determine this machine's Tailscale name. Enable MagicDNS in the admin\n" +
      "  console, run `tailscale up`, then try again.",
  );
}

// 2. Write REMOTE_HOSTNAMES into .env without disturbing anything else.
if (!existsSync(ENV_PATH)) {
  if (existsSync(EXAMPLE_PATH)) copyFileSync(EXAMPLE_PATH, ENV_PATH);
  else writeFileSync(ENV_PATH, "");
  console.log("• created .env from .env.example — set your secrets before going live");
}
let env = readFileSync(ENV_PATH, "utf8");
const line = `REMOTE_HOSTNAMES="${dns}"`;
if (/^\s*REMOTE_HOSTNAMES=.*$/m.test(env)) {
  env = env.replace(/^\s*REMOTE_HOSTNAMES=.*$/m, line);
} else {
  env += (env.endsWith("\n") || env === "" ? "" : "\n") + line + "\n";
}
writeFileSync(ENV_PATH, env);

// 3. Share localhost:PORT over the tailnet (HTTPS). Best-effort: if the installed
//    CLI uses different flags, fall back to printing the manual command.
let served = false;
try {
  tailscale(["serve", "--bg", PORT]);
  served = true;
} catch {
  try {
    tailscale(["serve", "--bg", `http://localhost:${PORT}`]);
    served = true;
  } catch {
    served = false;
  }
}

console.log(`\n✓ Tailscale name : ${dns}`);
console.log(`✓ .env           : REMOTE_HOSTNAMES set`);
console.log(
  served
    ? `✓ Tailscale Serve: sharing localhost:${PORT} over your tailnet (HTTPS)`
    : `! Tailscale Serve: couldn't start automatically — run it yourself:\n    tailscale serve --bg ${PORT}\n  (older versions: tailscale serve https / http://localhost:${PORT})`,
);
console.log(`\nNext:`);
console.log(`  1) (re)start the app so REMOTE_HOSTNAMES takes effect:  npm run dev`);
console.log(`  2) on your phone (Tailscale on), open:  https://${dns}`);
if (served) console.log(`\nTo stop sharing later:  tailscale serve --bg ${PORT} off`);
