// Want ↔ Vehicle matching engine (brief §8).
//
// Hard filters (must all pass): make, model, year range, price ≤ max,
// mileage ≤ max, condition compatible. Soft scoring (ranks passers): colour,
// trim closeness, drivetrain, price headroom, want priority.
//
// Match rows are upserted with status NEW; a human-touched status
// (INTERESTED/PASSED/SOLD) is preserved on re-scan, and stale NEW matches are
// pruned. Relative imports so the background worker can run this directly.
import { Prisma, type Want, type Vehicle, type VehicleStatus } from "@prisma/client";
import { prisma } from "./db";

// Vehicles eligible to generate new matches (not sold/allocated/archived).
const AVAILABLE: VehicleStatus[] = ["ON_ORDER", "IN_TRANSIT", "ARRIVED", "IN_STOCK"];

const ci = (s?: string | null) => (s ?? "").trim().toLowerCase();
const num = (d: Prisma.Decimal | number | null | undefined) =>
  d === null || d === undefined ? null : Number(d.toString());

function conditionCompatible(want: string, vehicle: string): boolean {
  if (want === "ANY") return true;
  if (want === "USED") return vehicle === "USED" || vehicle === "CPO";
  return want === vehicle; // NEW→NEW, CPO→CPO
}

export type MatchScore = { score: number; matchedFields: Prisma.InputJsonValue };

/** Score a want against a vehicle. Returns null if any hard filter fails. */
export function scoreMatch(want: Want, vehicle: Vehicle): MatchScore | null {
  // ── Hard filters ──
  const wMake = ci(want.make);
  const vMake = ci(vehicle.make);
  if (want.make && !(vMake.includes(wMake) || wMake.includes(vMake))) return null;

  const wModel = ci(want.model);
  const vModel = ci(vehicle.model);
  if (want.model && !(vModel.includes(wModel) || wModel.includes(vModel))) return null;

  if (want.yearMin != null && (vehicle.year == null || vehicle.year < want.yearMin)) return null;
  if (want.yearMax != null && (vehicle.year == null || vehicle.year > want.yearMax)) return null;

  const priceMax = num(want.priceMax);
  const price = num(vehicle.price);
  if (priceMax != null && (price == null || price > priceMax)) return null;

  if (want.mileageMax != null && vehicle.mileage != null && vehicle.mileage > want.mileageMax)
    return null;

  if (!conditionCompatible(want.condition, vehicle.condition)) return null;

  // ── Soft scoring ──
  let score = 10; // base for clearing all hard filters
  const soft: Record<string, unknown> = {};

  const vExt = ci(vehicle.colorExterior);
  if (vExt && want.colorExterior.some((c) => ci(c) === vExt)) {
    score += 30;
    soft.exteriorColor = vehicle.colorExterior;
  }
  const vInt = ci(vehicle.colorInterior);
  if (vInt && want.colorInterior.some((c) => ci(c) === vInt)) {
    score += 15;
    soft.interiorColor = vehicle.colorInterior;
  }

  const wTrim = ci(want.trim);
  const vTrim = ci(vehicle.trim);
  if (want.trim && vTrim) {
    if (wTrim === vTrim) {
      score += 25;
      soft.trim = "exact";
    } else if (vTrim.includes(wTrim) || wTrim.includes(vTrim)) {
      score += 10;
      soft.trim = "close";
    }
  }

  const wDrive = ci(want.drivetrain);
  const vDrive = ci(vehicle.drivetrain);
  if (want.drivetrain && vDrive && (wDrive === vDrive || vDrive.includes(wDrive))) {
    score += 10;
    soft.drivetrain = vehicle.drivetrain;
  }

  if (priceMax != null && price != null && priceMax > 0) {
    const headroom = Math.max(0, Math.min(1, (priceMax - price) / priceMax));
    score += Math.round(headroom * 15); // cheaper than the cap ranks higher
  }

  score += (want.priority || 0) * 5;

  const matchedFields = {
    hard: {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      price,
      mileage: vehicle.mileage,
      condition: vehicle.condition,
    },
    soft,
  };

  return { score, matchedFields: matchedFields as Prisma.InputJsonValue };
}

async function upsertMatch(wantId: string, vehicleId: string, r: MatchScore) {
  await prisma.match.upsert({
    where: { wantId_vehicleId: { wantId, vehicleId } },
    create: { wantId, vehicleId, score: r.score, matchedFields: r.matchedFields, status: "NEW" },
    update: { score: r.score, matchedFields: r.matchedFields }, // keep human-set status
  });
}

/** (Re)compute matches for one vehicle against all active wants. */
export async function matchVehicle(vehicleId: string): Promise<number> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.archivedAt || !AVAILABLE.includes(vehicle.status)) {
    await prisma.match.deleteMany({ where: { vehicleId, status: "NEW" } });
    return 0;
  }
  const wants = await prisma.want.findMany({ where: { archivedAt: null, active: true } });
  const passing: string[] = [];
  for (const w of wants) {
    const r = scoreMatch(w, vehicle);
    if (!r) continue;
    passing.push(w.id);
    await upsertMatch(w.id, vehicleId, r);
  }
  await prisma.match.deleteMany({
    where: { vehicleId, status: "NEW", wantId: { notIn: passing.length ? passing : ["__none__"] } },
  });
  return passing.length;
}

/** (Re)compute matches for one want against all available vehicles. */
export async function matchWant(wantId: string): Promise<number> {
  const want = await prisma.want.findUnique({ where: { id: wantId } });
  if (!want || want.archivedAt || !want.active) {
    await prisma.match.deleteMany({ where: { wantId, status: "NEW" } });
    return 0;
  }
  const vehicles = await prisma.vehicle.findMany({
    where: { archivedAt: null, status: { in: AVAILABLE } },
  });
  const passing: string[] = [];
  for (const v of vehicles) {
    const r = scoreMatch(want, v);
    if (!r) continue;
    passing.push(v.id);
    await upsertMatch(wantId, v.id, r);
  }
  await prisma.match.deleteMany({
    where: { wantId, status: "NEW", vehicleId: { notIn: passing.length ? passing : ["__none__"] } },
  });
  return passing.length;
}

/** Best-effort trigger from create/update actions — never breaks the save. */
export async function matchVehicleSafe(id: string) {
  try {
    await matchVehicle(id);
  } catch (e) {
    console.error("matchVehicle failed", e);
  }
}
export async function matchWantSafe(id: string) {
  try {
    await matchWant(id);
  } catch (e) {
    console.error("matchWant failed", e);
  }
}

/** Full re-scan (scheduled in the worker). */
export async function rescanAll(): Promise<number> {
  const vehicles = await prisma.vehicle.findMany({
    where: { archivedAt: null, status: { in: AVAILABLE } },
    select: { id: true },
  });
  let total = 0;
  for (const v of vehicles) total += await matchVehicle(v.id);
  return total;
}

/** Daily digest figures for the single user (brief §8). */
export async function buildDigest() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [newToday, totalNew, interested] = await Promise.all([
    prisma.match.count({ where: { status: "NEW", createdAt: { gte: since } } }),
    prisma.match.count({ where: { status: "NEW" } }),
    prisma.match.count({ where: { status: "INTERESTED" } }),
  ]);
  return { newToday, totalNew, interested };
}
