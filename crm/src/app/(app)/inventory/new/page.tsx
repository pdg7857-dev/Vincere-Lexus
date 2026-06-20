import Link from "next/link";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { card } from "@/lib/ui";

export default function NewVehiclePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-slate-500 hover:underline">
          ← Inventory
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Add vehicle</h1>
      </div>
      <div className={card}>
        <VehicleForm />
      </div>
    </div>
  );
}
