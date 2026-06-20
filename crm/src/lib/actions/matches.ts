"use server";

import { revalidatePath } from "next/cache";
import type { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function vehicleLabel(v: {
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  stockNumber: string | null;
}) {
  const base = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  return v.stockNumber ? `${base} (#${v.stockNumber})` : base;
}

/** Match inbox actions: mark interested / passed / sold, logging outcomes. */
export async function setMatchStatus(matchId: string, status: MatchStatus) {
  await requireUser();
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { want: true, vehicle: true },
  });
  if (!match) return;

  await prisma.match.update({ where: { id: matchId }, data: { status } });

  if (status === "INTERESTED") {
    await prisma.activity.create({
      data: {
        customerId: match.want.customerId,
        type: "NOTE",
        body: `Interested in ${vehicleLabel(match.vehicle)} — flagged from a match.`,
        source: "MANUAL",
      },
    });
  }

  if (status === "SOLD") {
    await prisma.vehicle.update({
      where: { id: match.vehicleId },
      data: { status: "SOLD", purchasedById: match.want.customerId },
    });
    // Recurring wants re-arm; one-offs deactivate after the sale.
    if (!match.want.recurring) {
      await prisma.want.update({ where: { id: match.wantId }, data: { active: false } });
    }
    await prisma.activity.create({
      data: {
        customerId: match.want.customerId,
        type: "NOTE",
        body: `Sold ${vehicleLabel(match.vehicle)} via a match.`,
        source: "MANUAL",
      },
    });
  }

  revalidatePath("/matches");
  revalidatePath("/dashboard");
  if (match.want.customerId) revalidatePath(`/customers/${match.want.customerId}`);
}
