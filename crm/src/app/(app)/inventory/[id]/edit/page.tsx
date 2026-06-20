import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { card } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, archivedAt: null },
  });
  if (!vehicle) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-slate-500 hover:underline">
          ← Inventory
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
        </h1>
      </div>
      <div className={card}>
        <VehicleForm vehicle={vehicle} />
      </div>
    </div>
  );
}
