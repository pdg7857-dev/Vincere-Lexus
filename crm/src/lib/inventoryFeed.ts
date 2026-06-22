// Auto inventory feed (backlog item): watch a local folder for inventory CSV
// drops — or a scheduled DMS export written there — and import them
// automatically using the same parser as the manual upload. Processed files are
// archived to `inventory-feed/processed`, parse failures to `inventory-feed/failed`,
// and every file logs a FeedRun row for the Settings history. Relative imports so
// the background worker (`tsx worker.ts`) can run this directly.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from "fs";
import path from "path";
import { prisma } from "./db";
import { importInventoryCsv } from "./inventoryImport";
import { matchVehicleSafe } from "./matching";

// Where to look for dropped CSVs. Defaults to `crm/inventory-feed` (relative to
// the process CWD, which is the crm/ folder for the app, worker, and scripts).
export function feedDir(): string {
  return path.resolve(
    process.env.INVENTORY_FEED_DIR || path.join(process.cwd(), "inventory-feed"),
  );
}

/** The feed is "on" once the drop folder exists (created by Run-now / the script). */
export function feedConfigured(): boolean {
  return existsSync(feedDir());
}

// Ignore files modified within the last few seconds — they may still be copying.
const STABLE_MS = 3000;

export type FeedFileResult = {
  file: string;
  status: "OK" | "FAILED";
  total: number;
  created: number;
  updated: number;
  skipped: number;
  message?: string;
};

export type FeedSummary = {
  dir: string;
  skipped?: "no-folder";
  files: FeedFileResult[];
};

/**
 * Process every *.csv in the feed folder once. With `create: true` the folder is
 * created if missing (used by the "Run import now" button so the user can see
 * where to drop files); otherwise a missing folder is a silent no-op (worker).
 */
export async function runFeed(opts: { create?: boolean } = {}): Promise<FeedSummary> {
  const dir = feedDir();
  if (!existsSync(dir)) {
    if (opts.create) mkdirSync(dir, { recursive: true });
    else return { dir, skipped: "no-folder", files: [] };
  }

  // Only files in the top level; the processed/ and failed/ subdirs are skipped.
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".csv"))
    .map((e) => e.name)
    .sort();

  const files: FeedFileResult[] = [];
  const affected: string[] = [];
  const now = Date.now();

  for (const name of names) {
    const full = path.join(dir, name);

    // Skip files that look like they're still being written.
    try {
      if (now - statSync(full).mtimeMs < STABLE_MS) continue;
    } catch {
      continue;
    }

    let text = "";
    try {
      text = readFileSync(full, "utf8");
    } catch (e) {
      files.push({
        file: name,
        status: "FAILED",
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        message: `read error: ${(e as Error).message}`,
      });
      continue;
    }

    const r = await importInventoryCsv(text);
    const failed = Boolean(r.parseError) && r.total === 0;
    const status: "OK" | "FAILED" = failed ? "FAILED" : "OK";
    const message = failed ? r.parseError : undefined;

    // Archive the file so it isn't re-imported next run.
    const subDir = path.join(dir, failed ? "failed" : "processed");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    try {
      mkdirSync(subDir, { recursive: true });
      renameSync(full, path.join(subDir, `${stamp}__${name}`));
    } catch {
      // If we can't move it, leave it; the FeedRun still records the attempt.
    }

    await prisma.feedRun.create({
      data: {
        source: name,
        status,
        total: r.total,
        created: r.created,
        updated: r.updated,
        skipped: r.skipped,
        message: message ?? null,
      },
    });
    affected.push(...r.affectedIds);
    files.push({
      file: name,
      status,
      total: r.total,
      created: r.created,
      updated: r.updated,
      skipped: r.skipped,
      message,
    });
  }

  // Recompute matches for everything the import touched (best-effort).
  for (const id of affected) await matchVehicleSafe(id);

  return { dir, files };
}
