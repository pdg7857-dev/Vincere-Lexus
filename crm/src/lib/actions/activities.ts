"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { activitySchema } from "@/lib/validation";
import { str, zodError, type FormState } from "@/lib/forms";

export async function addActivity(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = activitySchema.safeParse({
    customerId: str(fd, "customerId"),
    type: str(fd, "type") ?? "NOTE",
    body: str(fd, "body"),
    occurredAt: str(fd, "occurredAt"),
  });
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;

  await prisma.activity.create({
    data: {
      customerId: d.customerId,
      type: d.type,
      body: d.body,
      occurredAt: d.occurredAt ?? new Date(),
      source: "MANUAL",
      // Phase 2 will populate `summary` via the Anthropic API.
    },
  });

  redirect(`/customers/${d.customerId}`);
}

export async function archiveActivity(id: string, customerId: string) {
  await requireUser();
  await prisma.activity.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  redirect(`/customers/${customerId}`);
}
