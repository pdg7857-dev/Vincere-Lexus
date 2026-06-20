// Background worker: polls the IMAP inbox on a schedule (brief §7C) and runs
// the intake pipeline. Run alongside the app with `npm run worker`.
//
// Phase 3 will add the vehicle-match re-scan to this same loop.
import "dotenv/config";
import * as cron from "node-cron";
import { pollInbox, imapConfigured } from "./src/lib/imap";

const SCHEDULE = process.env.POLL_CRON || "*/5 * * * *"; // every 5 minutes

async function tick() {
  try {
    const r = await pollInbox();
    if (r.skipped) return;
    if (r.error) console.error(`[worker] poll error: ${r.error}`);
    else console.log(`[worker] polled inbox — ${r.processed} new message(s) processed`);
  } catch (e) {
    console.error("[worker] unexpected error", e);
  }
}

console.log(
  `[worker] starting — IMAP ${imapConfigured() ? "configured" : "NOT configured (idle)"}; schedule "${SCHEDULE}"`,
);
cron.schedule(SCHEDULE, tick);
void tick(); // run once on startup
