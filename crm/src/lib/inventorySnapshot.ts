// Import the dealer inventory snapshot (data/inventory.json — the output of
// scripts/scrape_inventory.py) into the Vehicle table. Idempotent: upserts by
// VIN. Shares the condition/status mappers with the CSV importer. Pure + relative
// imports so the worker and standalone scripts can run it.
import { readFileSync } from "fs";
import path from "path";
import { prisma } from "./db";
import { toCondition, toStatus, type ImportResult } from "./inventoryImport";

type SnapshotUnit = {
  vin?: string;
  stock?: string;
  year?: number;
  model?: string;
  trim?: string;
  exterior?: string;
  price?: number;
  odometer?: number;
  condition?: string;
  certified?: boolean;
  status?: string;
  brand?: string;
};

type Snapshot = {
  meta?: { dealer?: string; url?: string; scraped?: string; count?: number };
  units?: SnapshotUnit[];
};

/** Canonical snapshot path: data/inventory.json at the repo root (../data from crm/). */
export function snapshotPath(): string {
  return path.resolve(
    process.env.INVENTORY_SNAPSHOT || path.join(process.cwd(), "..", "data", "inventory.json"),
  );
}

export type SnapshotResult = ImportResult & { dealer?: string; scrapedAt?: string };

export async function importSnapshot(file = snapshotPath()): Promise<SnapshotResult> {
  const res: SnapshotResult = { total: 0, created: 0, updated: 0, skipped: 0, affectedIds: [] };

  let json: Snapshot;
  try {
    json = JSON.parse(readFileSync(file, "utf8")) as Snapshot;
  } catch (e) {
    res.parseError = `can't read snapshot (${file}): ${(e as Error).message}`;
    return res;
  }

  const units = json.units ?? [];
  res.total = units.length;
  res.dealer = json.meta?.dealer;
  res.scrapedAt = json.meta?.scraped;
  const dealerLoc = json.meta?.dealer ?? null;

  for (const u of units) {
    if (!u.model) {
      res.skipped++;
      continue;
    }
    const data = {
      make: u.brand || "Lexus",
      model: u.model,
      trim: u.trim ?? null,
      year: u.year ?? null,
      vin: u.vin ?? null,
      stockNumber: u.stock ?? null,
      colorExterior: u.exterior ?? null,
      mileage: u.odometer ?? null,
      price: u.price ?? null,
      condition: toCondition(u.condition, u.certified),
      status: toStatus(u.status),
      location: dealerLoc,
    };

    if (data.vin) {
      const existing = await prisma.vehicle.findUnique({ where: { vin: data.vin } });
      if (existing) {
        const v = await prisma.vehicle.update({ where: { vin: data.vin }, data });
        res.updated++;
        res.affectedIds.push(v.id);
        continue;
      }
    }
    const v = await prisma.vehicle.create({ data });
    res.created++;
    res.affectedIds.push(v.id);
  }

  return res;
}
