import Link from "next/link";
import { prisma } from "@/lib/db";
import { PipelineBoard } from "@/components/PipelineBoard";
import { btnPrimary } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [stages, deals] = await Promise.all([
    prisma.stage.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" } }),
    prisma.deal.findMany({
      where: { archivedAt: null },
      include: { customer: true, vehicle: true },
      orderBy: { stageChangedAt: "desc" },
    }),
  ]);

  const boardStages = stages.map((s) => ({
    id: s.id,
    name: s.name,
    isWon: s.isWon,
    isTerminal: s.isTerminal,
  }));

  const boardDeals = deals.map((d) => ({
    id: d.id,
    title: d.title,
    value: d.value ? d.value.toString() : null,
    stageId: d.stageId,
    customerName: d.customer.name,
    customerId: d.customerId,
    vehicleLabel: d.vehicle
      ? [d.vehicle.year, d.vehicle.make, d.vehicle.model, d.vehicle.trim]
          .filter(Boolean)
          .join(" ")
      : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <Link href="/pipeline/new" className={btnPrimary}>
          + New deal
        </Link>
      </div>

      {stages.length === 0 ? (
        <p className="text-sm text-slate-400">
          No stages configured. Add some in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          .
        </p>
      ) : (
        <PipelineBoard stages={boardStages} deals={boardDeals} />
      )}
    </div>
  );
}
