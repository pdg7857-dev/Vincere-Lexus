"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { str, type FormState } from "@/lib/forms";

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

export async function importVehiclesCsv(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();

  const file = fd.get("file");
  let text = "";
  if (file instanceof File && file.size > 0) text = await file.text();
  else text = str(fd, "csv") ?? "";
  if (!text.trim()) return { error: "Choose a CSV file or paste CSV text." };

  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length && parsed.data.length === 0)
    return { error: `Couldn't parse CSV: ${parsed.errors[0].message}` };

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of parsed.data) {
    const r = lc(raw);
    const make = pick(r, "make", "brand");
    const model = pick(r, "model");
    if (!make || !model) {
      skipped++;
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
        await prisma.vehicle.update({ where: { vin: data.vin }, data });
        updated++;
        continue;
      }
    }
    await prisma.vehicle.create({ data });
    created++;
  }

  revalidatePath("/inventory");
  return {
    ok: true,
    message: `Imported ${created} new, updated ${updated}${skipped ? `, skipped ${skipped} (missing make/model)` : ""}.`,
  };
}
