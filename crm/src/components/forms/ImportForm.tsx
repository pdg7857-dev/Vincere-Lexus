"use client";

import { useActionState } from "react";
import { importVehiclesCsv } from "@/lib/actions/import";
import { SubmitButton } from "@/components/SubmitButton";
import { input, label } from "@/lib/ui";
import type { FormState } from "@/lib/forms";

export function ImportForm() {
  const [state, action] = useActionState<FormState, FormData>(
    importVehiclesCsv,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      )}
      <div>
        <label className={label}>CSV file</label>
        <input className={input} type="file" name="file" accept=".csv,text/csv" />
      </div>
      <div>
        <label className={label}>…or paste CSV</label>
        <textarea
          className={input + " font-mono text-xs"}
          name="csv"
          rows={6}
          placeholder="make,model,trim,year,vin,price,mileage,condition,status"
        />
      </div>
      <SubmitButton pendingLabel="Importing…">Import</SubmitButton>
    </form>
  );
}
