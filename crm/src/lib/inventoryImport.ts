// Shared inventory CSV → Vehicle import core. Used by BOTH the manual upload
// (src/lib/actions/import.ts) and the auto inventory feed (src/lib/inventoryFeed.ts,
// run from the background worker). Kept pure — no Next.js / auth imports — and uses
// a relative DB import so `tsx` can load it outside the Next "@/" alias.
import Papa from "papaparse";
import { prisma } from "./db";

// Free-text condition/status from a dealer/DMS export → our enums.
const CONDITION_MAP: Record<string, string> = {
  new: "NEW",
  used: "USED",
  cpo: "CPO",
  certified: "CPO",
  "certified pre-owned": "CPO",
  "pre-owned": "USED",
  preowned: "USED",
  demo: "USED",
};
const STATUS_MAP: Record<string, string> = {
  "in stock": "IN_STOCK",
  in_stock: "IN_STOCK",
  instock: "IN_STOCK",
  "on order": "ON_ORDER",
  on_order: "ON_ORDER",
  "in transit": "IN_TRANSIT",
  in_transit: "IN_TRANSIT",
  arrived: "ARRIVED",
  allocated: "ALLOCATED",
  sold: "SOLD",
};

/** Lower-case + trim every header so column matching is case/space-insensitive. */
function lc(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null) continue;
    out[k.trim().toLowerCase()] = String(v).trim();
  }
  return out;
}

function pick(r: Record<string, string>, ...keys: string[]) {
  for (const k of keys) if (r[k]) return r[k];
  return undefined;
}

function toInt(s?: string) {
  if (!s) return undefined;
  const n = parseInt(s.replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

function toNum(s?: string) {
  if (!s) return undefined;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export type ImportResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  affectedIds: string[]; // vehicles created/updated — for downstream re-matching
  parseError?: string;
};

/**
 * Parse an inventory CSV and upsert vehicles by VIN. Returns counts plus the
 * ids of every vehicle it touched (so the caller can recompute matches). Rows
 * without make+model are skipped. Never throws on bad data — only a fatal CSV
 * parse failure sets `parseError`.
 */
export async function importInventoryCsv(text: string): Promise<ImportResult> {
  const result: ImportResult = { total: 0, created: 0, updated: 0, skipped: 0, affectedIds: [] };
  if (!text.trim()) {
    result.parseError = "Empty CSV.";
    return result;
  }

  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length && parsed.data.length === 0) {
    result.parseError = parsed.errors[0].message;
    return result;
  }
  result.total = parsed.data.length;

  for (const raw of parsed.data) {
    const r = lc(raw);
    const make = pick(r, "make", "brand");
    const model = pick(r, "model");
    if (!make || !model) {
      result.skipped++;
      continue;
    }

    const conditionRaw = (pick(r, "condition") ?? "").toLowerCase();
    const statusRaw = (pick(r, "status") ?? "").toLowerCase();
    const certified = /^(y|yes|true|1)$/i.test(pick(r, "certified", "cpo") ?? "");

    const data = {
      make,
      model,
      trim: pick(r, "trim") ?? null,
      year: toInt(pick(r, "year")) ?? null,
      vin: pick(r, "vin") ?? null,
      stockNumber: pick(r, "stocknumber", "stock", "stock #", "stock_number") ?? null,
      colorExterior: pick(r, "colorexterior", "exterior", "exterior color", "color") ?? null,
      colorInterior: pick(r, "colorinterior", "interior", "interior color") ?? null,
      mileage: toInt(pick(r, "mileage", "odometer", "km")) ?? null,
      price: toNum(pick(r, "price")) ?? null,
      cost: toNum(pick(r, "cost")) ?? null,
      condition: (certified ? "CPO" : CONDITION_MAP[conditionRaw] ?? "USED") as
        | "NEW"
        | "USED"
        | "CPO"
        | "ANY",
      status: (STATUS_MAP[statusRaw] ?? "IN_STOCK") as
        | "ON_ORDER"
        | "IN_TRANSIT"
        | "ARRIVED"
        | "IN_STOCK"
        | "ALLOCATED"
        | "SOLD",
      location: pick(r, "location", "dealer") ?? null,
      newExportRestricted: /^(y|yes|true|1)$/i.test(
        pick(r, "newexportrestricted", "exportrestricted") ?? "",
      ),
    };

    if (data.vin) {
      const existing = await prisma.vehicle.findUnique({ where: { vin: data.vin } });
      if (existing) {
        const v = await prisma.vehicle.update({ where: { vin: data.vin }, data });
        result.updated++;
        result.affectedIds.push(v.id);
        continue;
      }
    }
    const v = await prisma.vehicle.create({ data });
    result.created++;
    result.affectedIds.push(v.id);
  }

  return result;
}
