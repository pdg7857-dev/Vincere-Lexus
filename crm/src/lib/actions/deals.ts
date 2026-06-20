"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dealSchema } from "@/lib/validation";
import { str, num, zodError, type FormState } from "@/lib/forms";

type HistoryEntry = { stageId: string; name: string; at: string };

function extract(fd: FormData) {
  return {
    customerId: str(fd, "customerId"),
    vehicleId: str(fd, "vehicleId"),
    stageId: str(fd, "stageId"),
    title: str(fd, "title"),
    value: num(fd, "value"),
    depositAmount: num(fd, "depositAmount"),
    notes: str(fd, "notes"),
  };
}

export async function createDeal(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = dealSchema.safeParse(extract(fd));
  if (!parsed.success) return zodError(parsed.error);
  const d = parsed.data;

  const stage = await prisma.stage.findUnique({ where: { id: d.stageId } });
  if (!stage) return { error: "Pick a valid stage." };

  const history: HistoryEntry[] = [
    { stageId: stage.id, name: stage.name, at: new Date().toISOString() },
  ];

  await prisma.deal.create({
    data: {
      customerId: d.customerId,
      vehicleId: d.vehicleId ?? null,
      stageId: d.stageId,
      title: d.title ?? null,
      value: d.value ?? null,
      depositAmount: d.depositAmount ?? null,
      notes: d.notes ?? null,
      stageChangedAt: new Date(),
      stageHistory: history,
    },
  });

  revalidatePath("/pipeline");
  revalidatePath(`/customers/${d.customerId}`);
  redirect("/pipeline");
}

/** Move a deal to a new stage (called from the Kanban board). Appends history. */
export async function moveDealStage(dealId: string, stageId: string) {
  await requireUser();
  const [deal, stage] = await Promise.all([
    prisma.deal.findUnique({ where: { id: dealId } }),
    prisma.stage.findUnique({ where: { id: stageId } }),
  ]);
  if (!deal || !stage) return;
  if (deal.stageId === stageId) return;

  const history = (Array.isArray(deal.stageHistory)
    ? (deal.stageHistory as unknown as HistoryEntry[])
    : []
  ).concat({ stageId: stage.id, name: stage.name, at: new Date().toISOString() });

  await prisma.deal.update({
    where: { id: dealId },
    data: { stageId, stageChangedAt: new Date(), stageHistory: history },
  });

  revalidatePath("/pipeline");
  if (deal.customerId) revalidatePath(`/customers/${deal.customerId}`);
}

export async function archiveDeal(id: string) {
  await requireUser();
  const deal = await prisma.deal.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/pipeline");
  if (deal.customerId) revalidatePath(`/customers/${deal.customerId}`);
}
