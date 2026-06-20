"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { activitySchema } from "@/lib/validation";
import { summarize, aiEnabled } from "@/lib/ai";
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

  // Best-effort AI summary when a key is configured (no-op otherwise).
  const summary = aiEnabled() ? await summarize(d.body) : null;

  await prisma.activity.create({
    data: {
      customerId: d.customerId,
      type: d.type,
      body: d.body,
      summary: summary ?? null,
      occurredAt: d.occurredAt ?? new Date(),
      source: "MANUAL",
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
