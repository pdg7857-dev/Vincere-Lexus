"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { str, bool, type FormState } from "@/lib/forms";

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/pipeline");
}

// ── Stages ──
export async function addStage(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const name = str(fd, "name");
  if (!name) return { error: "Stage name is required." };
  const isTerminal = bool(fd, "isTerminal");
  const isWon = bool(fd, "isWon");

  const last = await prisma.stage.findFirst({ orderBy: { order: "desc" } });
  try {
    await prisma.stage.create({
      data: { name, order: (last?.order ?? 0) + 1, isTerminal, isWon },
    });
  } catch {
    return { error: "A stage with that name already exists." };
  }
  refresh();
  return { ok: true };
}

export async function renameStage(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!id || !name) return { error: "Name is required." };
  try {
    await prisma.stage.update({ where: { id }, data: { name } });
  } catch {
    return { error: "A stage with that name already exists." };
  }
  refresh();
  return { ok: true };
}

export async function moveStage(id: string, dir: "up" | "down") {
  await requireUser();
  const stages = await prisma.stage.findMany({
    where: { archivedAt: null },
    orderBy: { order: "asc" },
  });
  const idx = stages.findIndex((s) => s.id === id);
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= stages.length) return;
  const a = stages[idx];
  const b = stages[swap];
  await prisma.$transaction([
    prisma.stage.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.stage.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  refresh();
}

export async function archiveStage(id: string) {
  await requireUser();
  const active = await prisma.stage.count({ where: { archivedAt: null } });
  if (active <= 1) return; // never leave zero stages
  const dealsHere = await prisma.deal.count({
    where: { stageId: id, archivedAt: null },
  });
  if (dealsHere > 0) return; // move its deals first
  await prisma.stage.update({ where: { id }, data: { archivedAt: new Date() } });
  refresh();
}

// ── Lead sources ──
export async function addLeadSource(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();
  const name = str(fd, "name");
  if (!name) return { error: "Lead source name is required." };
  const last = await prisma.leadSource.findFirst({ orderBy: { order: "desc" } });
  try {
    await prisma.leadSource.create({
      data: { name, order: (last?.order ?? 0) + 1 },
    });
  } catch {
    return { error: "That lead source already exists." };
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function archiveLeadSource(id: string) {
  await requireUser();
  await prisma.leadSource.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/settings");
}
