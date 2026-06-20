"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { matchWantSafe } from "@/lib/matching";
import { wantSchema } from "@/lib/validation";
import { str, num, bool, list, zodError, type FormState } from "@/lib/forms";

function extract(fd: FormData) {
  return {
    make: str(fd, "make"),
    model: str(fd, "model"),
    trim: str(fd, "trim"),
    yearMin: num(fd, "yearMin"),
    yearMax: num(fd, "yearMax"),
    body: str(fd, "body"),
    drivetrain: str(fd, "drivetrain"),
    colorExterior: list(fd, "colorExterior"),
    colorInterior: list(fd, "colorInterior"),
    mileageMax: num(fd, "mileageMax"),
    condition: str(fd, "condition") ?? "ANY",
    priceMax: num(fd, "priceMax"),
    currency: str(fd, "currency") ?? "CAD",
    optionsRequired: list(fd, "optionsRequired"),
    optionsNiceToHave: list(fd, "optionsNiceToHave"),
    quantity: num(fd, "quantity") ?? 1,
    recurring: bool(fd, "recurring"),
    priority: num(fd, "priority") ?? 0,
    active: fd.get("active") === null ? true : bool(fd, "active"),
    destinationSpecNotes: str(fd, "destinationSpecNotes"),
  };
}

export async function createWant(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const customerId = str(fd, "customerId");
  if (!customerId) return { error: "Missing customer." };

  const parsed = wantSchema.safeParse(extract(fd));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;

  const created = await prisma.want.create({
    data: {
      customerId,
      make: d.make ?? null,
      model: d.model ?? null,
      trim: d.trim ?? null,
      yearMin: d.yearMin ?? null,
      yearMax: d.yearMax ?? null,
      body: d.body ?? null,
      drivetrain: d.drivetrain ?? null,
      colorExterior: d.colorExterior,
      colorInterior: d.colorInterior,
      mileageMax: d.mileageMax ?? null,
      condition: d.condition,
      priceMax: d.priceMax ?? null,
      currency: d.currency,
      optionsRequired: d.optionsRequired,
      optionsNiceToHave: d.optionsNiceToHave,
      quantity: d.quantity,
      recurring: d.recurring,
      priority: d.priority,
      active: d.active,
      destinationSpecNotes: d.destinationSpecNotes ?? null,
    },
  });

  await matchWantSafe(created.id);
  revalidatePath("/matches");
  redirect(`/customers/${customerId}`);
}

export async function archiveWant(id: string, customerId: string) {
  await requireUser();
  await prisma.want.update({
    where: { id },
    data: { archivedAt: new Date(), active: false },
  });
  await matchWantSafe(id);
  revalidatePath("/matches");
  redirect(`/customers/${customerId}`);
}

export async function toggleWantActive(id: string, customerId: string, active: boolean) {
  await requireUser();
  await prisma.want.update({ where: { id }, data: { active } });
  await matchWantSafe(id);
  revalidatePath("/matches");
  redirect(`/customers/${customerId}`);
}
