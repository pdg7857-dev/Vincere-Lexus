import Link from "next/link";
import { prisma } from "@/lib/db";
import { DealForm } from "@/components/forms/DealForm";
import { card } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const sp = await searchParams;
  const [customers, stages, vehicles] = await Promise.all([
    prisma.customer.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.stage.findMany({
      where: { archivedAt: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.vehicle.findMany({
      where: { archivedAt: null, status: { not: "SOLD" } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  const vlist = vehicles.map((v) => ({
    id: v.id,
    label:
      [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") +
      (v.stockNumber ? ` (#${v.stockNumber})` : ""),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/pipeline" className="text-sm text-slate-500 hover:underline">
          ← Pipeline
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">New deal</h1>
      </div>
      <div className={card + " max-w-3xl"}>
        <DealForm
          customers={customers}
          stages={stages}
          vehicles={vlist}
          customerId={sp.customerId}
        />
      </div>
    </div>
  );
}
