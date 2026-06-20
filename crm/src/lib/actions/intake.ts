"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pollInbox } from "@/lib/imap";

/** Manually trigger an IMAP poll from Settings ("Poll now"). */
export async function pollEmailNow() {
  await requireUser();
  await pollInbox();
  revalidatePath("/intake");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** Confirm an AI-created/updated record: clear the review flags. */
export async function approveIntake(id: string) {
  await requireUser();
  const ev = await prisma.intakeEvent.update({
    where: { id },
    data: { status: "APPROVED", resolvedAt: new Date() },
  });
  if (ev.customerId) {
    await prisma.customer.update({
      where: { id: ev.customerId },
      data: { needsReview: false, aiUnverifiedFields: [] },
    });
  }
  revalidatePath("/intake");
  revalidatePath("/dashboard");
}

/** Dismiss an intake item without changing the customer. */
export async function rejectIntake(id: string) {
  await requireUser();
  await prisma.intakeEvent.update({
    where: { id },
    data: { status: "REJECTED", resolvedAt: new Date() },
  });
  revalidatePath("/intake");
}
