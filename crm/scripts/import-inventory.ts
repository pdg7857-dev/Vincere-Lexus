// One-off bulk import of the bundled dealer inventory snapshot
// (../data/inventory.json, shared with the showroom tool) into the Vehicle
// table. Idempotent: upserts by VIN. Run with `npm run import:inventory`.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();

type Unit = {
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
  type?: string;
  brand?: string;
};

function condition(u: Unit): "NEW" | "USED" | "CPO" {
  if (u.certified) return "CPO";
  if ((u.condition ?? "").toLowerCase() === "new" || u.type === "new") return "NEW";
  return "USED";
}

async function main() {
  const file = path.resolve(process.cwd(), "../data/inventory.json");
  const json = JSON.parse(readFileSync(file, "utf8")) as {
    meta?: { dealer?: string };
    units?: Unit[];
  };
  const units = json.units ?? [];
  const dealer = json.meta?.dealer ?? null;

  let created = 0;
  let updated = 0;
  for (const u of units) {
    if (!u.model) continue;
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
      condition: condition(u),
      status: "IN_STOCK" as const,
      location: dealer,
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
  console.log(`✓ imported ${created} new, updated ${updated} (from ${units.length} units)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
