"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { customerSchema } from "@/lib/validation";
import { str, list, bool, zodError, type FormState } from "@/lib/forms";

function extract(fd: FormData) {
  return {
    name: str(fd, "name"),
    businessName: str(fd, "businessName"),
    type: str(fd, "type"),
    phone: str(fd, "phone"),
    email: str(fd, "email")?.toLowerCase(),
    preferredChannel: str(fd, "preferredChannel"),
    language: str(fd, "language"),
    leadSourceId: str(fd, "leadSourceId"),
    status: str(fd, "status"),
    tags: list(fd, "tags"),
    whatTheyDoWithCars: str(fd, "whatTheyDoWithCars"),
    exportDestination: str(fd, "exportDestination"),
    typicalVolume: str(fd, "typicalVolume"),
    buyingCadence: str(fd, "buyingCadence"),
    paymentMethod: str(fd, "paymentMethod"),
    consentToContact: bool(fd, "consentToContact"),
  };
}

/** Dedupe by email/phone among non-archived customers (brief §7A). */
async function findDuplicate(email?: string, phone?: string, excludeId?: string) {
  const or = [];
  if (email) or.push({ email });
  if (phone) or.push({ phone });
  if (or.length === 0) return null;
  return prisma.customer.findFirst({
    where: {
      archivedAt: null,
      OR: or,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });
}

export async function createCustomer(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = customerSchema.safeParse(extract(fd));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;

  const dupe = await findDuplicate(d.email, d.phone);
  if (dupe)
    return {
      error: `Looks like “${dupe.name}” already has this email/phone. Open their profile to update instead.`,
    };

  const created = await prisma.customer.create({
    data: {
      name: d.name,
      businessName: d.businessName ?? null,
      type: d.type,
      phone: d.phone ?? null,
      email: d.email ?? null,
      preferredChannel: d.preferredChannel ?? null,
      language: d.language ?? null,
      leadSourceId: d.leadSourceId ?? null,
      status: d.status,
      tags: d.tags,
      whatTheyDoWithCars: d.whatTheyDoWithCars ?? null,
      exportDestination: d.exportDestination ?? null,
      typicalVolume: d.typicalVolume ?? null,
      buyingCadence: d.buyingCadence ?? null,
      paymentMethod: d.paymentMethod ?? null,
      consentToContact: d.consentToContact,
      consentDate: d.consentToContact ? new Date() : null,
      source: "FORM",
    },
  });

  revalidatePath("/customers");
  redirect(`/customers/${created.id}`);
}

export async function updateCustomer(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const id = str(fd, "id");
  if (!id) return { error: "Missing customer id." };

  const parsed = customerSchema.safeParse(extract(fd));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;

  const dupe = await findDuplicate(d.email, d.phone, id);
  if (dupe)
    return { error: `That email/phone already belongs to “${dupe.name}”.` };

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return { error: "Customer not found." };

  // Set consentDate the first time consent is turned on; keep it otherwise.
  const consentDate = d.consentToContact
    ? (existing.consentDate ?? new Date())
    : null;

  await prisma.customer.update({
    where: { id },
    data: {
      name: d.name,
      businessName: d.businessName ?? null,
      type: d.type,
      phone: d.phone ?? null,
      email: d.email ?? null,
      preferredChannel: d.preferredChannel ?? null,
      language: d.language ?? null,
      leadSourceId: d.leadSourceId ?? null,
      status: d.status,
      tags: d.tags,
      whatTheyDoWithCars: d.whatTheyDoWithCars ?? null,
      exportDestination: d.exportDestination ?? null,
      typicalVolume: d.typicalVolume ?? null,
      buyingCadence: d.buyingCadence ?? null,
      paymentMethod: d.paymentMethod ?? null,
      consentToContact: d.consentToContact,
      consentDate,
      // Editing confirms AI-filled fields → clear the unverified flags.
      aiUnverifiedFields: [],
      needsReview: false,
    },
  });

  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function archiveCustomer(id: string) {
  await requireUser();
  await prisma.customer.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/customers");
  redirect("/customers");
}

/** PIPEDA opt-out / opt-in toggle. */
export async function setConsent(id: string, consent: boolean) {
  await requireUser();
  await prisma.customer.update({
    where: { id },
    data: {
      consentToContact: consent,
      consentDate: consent ? new Date() : null,
    },
  });
  revalidatePath(`/customers/${id}`);
}

/**
 * PIPEDA "right to be forgotten": hard-delete a customer and all related rows.
 * Cascades remove wants, activities, deals and their matches.
 */
export async function purgeCustomer(id: string) {
  await requireUser();
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  redirect("/customers");
}
