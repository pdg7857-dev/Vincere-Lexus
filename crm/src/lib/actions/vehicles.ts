"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { matchVehicleSafe } from "@/lib/matching";
import { vehicleSchema } from "@/lib/validation";
import { str, num, bool, zodError, type FormState } from "@/lib/forms";

function extract(fd: FormData) {
  return {
    vin: str(fd, "vin"),
    stockNumber: str(fd, "stockNumber"),
    make: str(fd, "make"),
    model: str(fd, "model"),
    trim: str(fd, "trim"),
    year: num(fd, "year"),
    body: str(fd, "body"),
    drivetrain: str(fd, "drivetrain"),
    colorExterior: str(fd, "colorExterior"),
    colorInterior: str(fd, "colorInterior"),
    mileage: num(fd, "mileage"),
    condition: str(fd, "condition") ?? "USED",
    price: num(fd, "price"),
    cost: num(fd, "cost"),
    status: str(fd, "status") ?? "IN_STOCK",
    source: str(fd, "source"),
    etaDate: str(fd, "etaDate"),
    location: str(fd, "location"),
    newExportRestricted: bool(fd, "newExportRestricted"),
  };
}

function toData(d: ReturnType<typeof vehicleSchema.parse>) {
  return {
    vin: d.vin ?? null,
    stockNumber: d.stockNumber ?? null,
    make: d.make,
    model: d.model,
    trim: d.trim ?? null,
    year: d.year ?? null,
    body: d.body ?? null,
    drivetrain: d.drivetrain ?? null,
    colorExterior: d.colorExterior ?? null,
    colorInterior: d.colorInterior ?? null,
    mileage: d.mileage ?? null,
    condition: d.condition,
    price: d.price ?? null,
    cost: d.cost ?? null,
    status: d.status,
    source: d.source ?? null,
    etaDate: d.etaDate ?? null,
    location: d.location ?? null,
    newExportRestricted: d.newExportRestricted,
  };
}

export async function createVehicle(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = vehicleSchema.safeParse(extract(fd));
  if (!parsed.success) return zodError(parsed.error);

  let created;
  try {
    created = await prisma.vehicle.create({ data: toData(parsed.data) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { error: "A vehicle with that VIN already exists." };
    throw e;
  }

  await matchVehicleSafe(created.id);
  revalidatePath("/inventory");
  revalidatePath("/matches");
  redirect("/inventory");
}

export async function updateVehicle(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const id = str(fd, "id");
  if (!id) return { error: "Missing vehicle id." };

  const parsed = vehicleSchema.safeParse(extract(fd));
  if (!parsed.success) return zodError(parsed.error);

  try {
    await prisma.vehicle.update({ where: { id }, data: toData(parsed.data) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { error: "A vehicle with that VIN already exists." };
    throw e;
  }

  await matchVehicleSafe(id);
  revalidatePath("/inventory");
  revalidatePath("/matches");
  redirect("/inventory");
}

export async function archiveVehicle(id: string) {
  await requireUser();
  await prisma.vehicle.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  await matchVehicleSafe(id);
  revalidatePath("/inventory");
  revalidatePath("/matches");
  redirect("/inventory");
}
