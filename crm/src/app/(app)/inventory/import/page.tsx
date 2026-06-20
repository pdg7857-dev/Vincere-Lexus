import Link from "next/link";
import { ImportForm } from "@/components/forms/ImportForm";
import { card } from "@/lib/ui";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-slate-500 hover:underline">
          ← Inventory
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Import vehicles (CSV)</h1>
      </div>

      <div className={card + " max-w-2xl"}>
        <ImportForm />
        <div className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <p className="font-medium text-slate-700">Recognized columns</p>
          <p className="mt-1">
            <code className="text-xs">
              make, model, trim, year, vin, stockNumber, colorExterior,
              colorInterior, mileage, price, cost, condition, status, location,
              certified
            </code>
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
            <li>Rows are matched/updated by <strong>VIN</strong> when present.</li>
            <li><code>condition</code>: new / used / cpo / demo. <code>certified=yes</code> ⇒ CPO.</li>
            <li><code>status</code>: in stock / on order / in transit / arrived / allocated / sold.</li>
            <li>Rows missing make or model are skipped.</li>
          </ul>
          <p className="mt-3 text-xs">
            You can also bulk-load the bundled Northwest Lexus snapshot with{" "}
            <code>npm run import:inventory</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
