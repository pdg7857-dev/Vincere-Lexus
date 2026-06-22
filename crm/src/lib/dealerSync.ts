// Dealer inventory sync: refresh the Northwest Lexus snapshot by running the
// existing scraper (scripts/scrape_inventory.py — covers new + pre-owned via the
// dealer sitemap + JSON-LD), then import it into the CRM and recompute matches.
//
// Safety: the scraper OVERWRITES data/inventory.json, so a blocked run (e.g.
// Cloudflare 403 from a non-home network) could clobber a good snapshot with an
// empty one. We back the file up first and restore it if the scrape yields zero
// units. Relative imports so the worker / scripts can run this directly.
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "./db";
import { importSnapshot, snapshotPath } from "./inventorySnapshot";
import { matchVehicleSafe } from "./matching";

// crm/ is the process CWD; the scraper + data live one level up at the repo root.
function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
}

export function scraperPath(): string {
  return path.join(repoRoot(), "scripts", "scrape_inventory.py");
}

export function scraperAvailable(): boolean {
  return existsSync(scraperPath());
}

function unitCount(file: string): number {
  try {
    return (JSON.parse(readFileSync(file, "utf8")).units ?? []).length;
  } catch {
    return 0;
  }
}

export type ScrapeResult = { ok: boolean; message: string };

/** Run the live scraper, protecting the existing snapshot from a blocked run. */
export async function runDealerScrape(timeoutMs = 8 * 60_000): Promise<ScrapeResult> {
  const script = scraperPath();
  if (!existsSync(script)) return { ok: false, message: `scraper not found at ${script}` };

  const snap = snapshotPath();
  const backup = existsSync(snap) ? readFileSync(snap, "utf8") : null;
  const py = process.env.PYTHON_BIN || "python3";

  const run = await new Promise<{ failed: boolean; out: string; err: string }>((resolve) => {
    execFile(
      py,
      [script],
      { cwd: repoRoot(), timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({ failed: Boolean(error), out: (stdout || "").trim(), err: (stderr || "").trim() });
      },
    );
  });

  const count = unitCount(snap);
  // A non-zero exit OR an empty result = treat as failed; never keep a wiped snapshot.
  if (run.failed || count === 0) {
    if (backup !== null) writeFileSync(snap, backup);
    const tail = (s: string) => s.split("\n").filter(Boolean).slice(-3).join(" ");
    const message =
      tail(run.err) ||
      tail(run.out) ||
      "scrape produced no inventory — likely blocked (Cloudflare / not on your home network). Snapshot left unchanged.";
    return { ok: false, message };
  }
  return { ok: true, message: `${count} units scraped` };
}

export type DealerSyncResult = {
  scraped: boolean;
  scrapeMessage?: string;
  imported?: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    dealer?: string;
    scrapedAt?: string;
  };
  error?: string;
};

/**
 * Sync dealer inventory. With `scrape: true` it refreshes from the web first;
 * otherwise it re-imports the snapshot already on disk. Either way it imports +
 * recomputes matches and logs a FeedRun so Settings shows the result.
 */
export async function syncDealer(opts: { scrape?: boolean } = {}): Promise<DealerSyncResult> {
  const result: DealerSyncResult = { scraped: false };

  if (opts.scrape) {
    const s = await runDealerScrape();
    result.scraped = s.ok;
    result.scrapeMessage = s.message;
    if (!s.ok) {
      await prisma.feedRun.create({
        data: { source: "Northwest Lexus (web)", status: "FAILED", message: s.message.slice(0, 500) },
      });
      result.error = s.message;
      return result; // don't import on a failed scrape
    }
  }

  const imp = await importSnapshot();
  if (imp.parseError && imp.total === 0) {
    await prisma.feedRun.create({
      data: { source: "Northwest Lexus (snapshot)", status: "FAILED", message: imp.parseError },
    });
    result.error = imp.parseError;
    return result;
  }

  for (const id of imp.affectedIds) await matchVehicleSafe(id);

  await prisma.feedRun.create({
    data: {
      source: opts.scrape ? "Northwest Lexus (web)" : "Northwest Lexus (snapshot)",
      status: "OK",
      total: imp.total,
      created: imp.created,
      updated: imp.updated,
      skipped: imp.skipped,
    },
  });
  result.imported = {
    total: imp.total,
    created: imp.created,
    updated: imp.updated,
    skipped: imp.skipped,
    dealer: imp.dealer,
    scrapedAt: imp.scrapedAt,
  };
  return result;
}
