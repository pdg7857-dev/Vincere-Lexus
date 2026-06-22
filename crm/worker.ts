// Background worker (brief §7C/§8): polls the IMAP inbox, re-scans Want↔Vehicle
// matches on a schedule, and prints a daily digest for the single user.
// Run alongside the app with `npm run worker`.
import "dotenv/config";
import * as cron from "node-cron";
import { pollInbox, imapConfigured } from "./src/lib/imap";
import { rescanAll, buildDigest } from "./src/lib/matching";
import { runFeed, feedConfigured, feedDir } from "./src/lib/inventoryFeed";

const POLL = process.env.POLL_CRON || "*/5 * * * *"; // email poll
const RESCAN = process.env.RESCAN_CRON || "*/15 * * * *"; // match re-scan
const DIGEST = process.env.DIGEST_CRON || "0 8 * * *"; // daily 08:00
const FEED = process.env.FEED_CRON || "*/10 * * * *"; // inventory CSV feed

async function poll() {
  try {
    const r = await pollInbox();
    if (r.skipped) return;
    if (r.error) console.error(`[worker] poll error: ${r.error}`);
    else console.log(`[worker] inbox — ${r.processed} new message(s) processed`);
  } catch (e) {
    console.error("[worker] poll crashed", e);
  }
}

async function rescan() {
  try {
    const n = await rescanAll();
    console.log(`[worker] match re-scan — ${n} active want↔vehicle match(es)`);
  } catch (e) {
    console.error("[worker] rescan crashed", e);
  }
}

async function feed() {
  try {
    const r = await runFeed();
    if (r.skipped || r.files.length === 0) return;
    const created = r.files.reduce((a, f) => a + f.created, 0);
    const updated = r.files.reduce((a, f) => a + f.updated, 0);
    console.log(
      `[worker] inventory feed — ${r.files.length} file(s): ${created} new, ${updated} updated`,
    );
  } catch (e) {
    console.error("[worker] feed crashed", e);
  }
}

async function digest() {
  try {
    const d = await buildDigest();
    console.log(
      `[digest] ${d.newToday} new match(es) in last 24h · ${d.totalNew} new total · ${d.interested} interested`,
    );
  } catch (e) {
    console.error("[worker] digest crashed", e);
  }
}

console.log(
  `[worker] starting — IMAP ${imapConfigured() ? "configured" : "NOT configured (idle)"}; ` +
    `inventory feed ${feedConfigured() ? `watching ${feedDir()}` : `idle (no ${feedDir()})`}; ` +
    `poll "${POLL}", rescan "${RESCAN}", feed "${FEED}", digest "${DIGEST}"`,
);
cron.schedule(POLL, poll);
cron.schedule(RESCAN, rescan);
cron.schedule(FEED, feed);
cron.schedule(DIGEST, digest);

// Run once on startup.
void poll();
void rescan();
void feed();
