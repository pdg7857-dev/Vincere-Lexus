import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { archiveVehicle } from "@/lib/actions/vehicles";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { btnPrimary, btnGhost, input, badge, vehicleStatusColor } from "@/lib/ui";
import { humanize, formatMoney } from "@/lib/format";
import { VEHICLE_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  const where: Prisma.VehicleWhereInput = { archivedAt: null };
  if (q) {
    where.OR = [
      { make: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { trim: { contains: q, mode: "insensitive" } },
      { vin: { contains: q, mode: "insensitive" } },
      { stockNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sp.status) where.status = sp.status as Prisma.VehicleWhereInput["status"];

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/inventory/import" className={btnGhost}>
            Import CSV
          </Link>
          <Link href="/inventory/new" className={btnPrimary}>
            + Add vehicle
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          className={input + " max-w-xs"}
          name="q"
          placeholder="Search make, model, VIN, stock #…"
          defaultValue={q ?? ""}
        />
        <select className={input + " w-auto"} name="status" defaultValue={sp.status ?? ""}>
          <option value="">Any status</option>
          {VEHICLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <button className={btnPrimary}>Search</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">VIN / Stock</th>
              <th className="px-4 py-3">Color</th>
              <th className="px-4 py-3 text-right">Mileage</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/inventory/${v.id}/edit`} className="font-medium hover:underline">
                    {[v.year, v.make, v.model, v.trim].filter(Boolean).join(" ")}
                  </Link>
                  {v.newExportRestricted && (
                    <span className={badge + " ml-2 bg-amber-50 text-amber-800"}>
                      export-restricted
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {v.vin ?? "—"}
                  {v.stockNumber && <div>#{v.stockNumber}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">{v.colorExterior ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {v.mileage != null ? `${v.mileage.toLocaleString()} km` : "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-700">
                  {formatMoney(v.price)}
                </td>
                <td className="px-4 py-3">
                  <span className={badge + " " + (vehicleStatusColor[v.status] ?? "")}>
                    {humanize(v.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ConfirmSubmit
                    action={archiveVehicle.bind(null, v.id)}
                    confirm="Archive this vehicle?"
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Archive
                  </ConfirmSubmit>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No vehicles. Add one or import a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
