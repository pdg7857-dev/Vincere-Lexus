"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Vehicle } from "@prisma/client";
import { createVehicle, updateVehicle } from "@/lib/actions/vehicles";
import { SubmitButton } from "@/components/SubmitButton";
import { Err } from "@/components/forms/Err";
import { input, label, btnGhost } from "@/lib/ui";
import { CONDITIONS, VEHICLE_STATUSES, VEHICLE_SOURCES } from "@/lib/constants";
import { humanize } from "@/lib/format";
import type { FormState } from "@/lib/forms";

export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const editing = Boolean(vehicle);
  const [state, action] = useActionState<FormState, FormData>(
    editing ? updateVehicle : createVehicle,
    {},
  );
  const v = vehicle;
  const eta = v?.etaDate ? new Date(v.etaDate).toISOString().slice(0, 10) : "";

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {editing && <input type="hidden" name="id" value={v!.id} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Make *</label>
          <input className={input} name="make" defaultValue={v?.make ?? "Lexus"} required />
          <Err msg={state?.fieldErrors?.make} />
        </div>
        <div>
          <label className={label}>Model *</label>
          <input className={input} name="model" defaultValue={v?.model ?? ""} required />
          <Err msg={state?.fieldErrors?.model} />
        </div>
        <div>
          <label className={label}>Trim</label>
          <input className={input} name="trim" defaultValue={v?.trim ?? ""} />
        </div>
        <div>
          <label className={label}>Year</label>
          <input className={input} name="year" inputMode="numeric" defaultValue={v?.year ?? ""} />
        </div>
        <div>
          <label className={label}>VIN</label>
          <input className={input} name="vin" defaultValue={v?.vin ?? ""} />
        </div>
        <div>
          <label className={label}>Stock #</label>
          <input className={input} name="stockNumber" defaultValue={v?.stockNumber ?? ""} />
        </div>
        <div>
          <label className={label}>Body</label>
          <input className={input} name="body" defaultValue={v?.body ?? ""} />
        </div>
        <div>
          <label className={label}>Drivetrain</label>
          <input className={input} name="drivetrain" defaultValue={v?.drivetrain ?? ""} />
        </div>
        <div>
          <label className={label}>Mileage (km)</label>
          <input className={input} name="mileage" inputMode="numeric" defaultValue={v?.mileage ?? ""} />
        </div>
        <div>
          <label className={label}>Exterior color</label>
          <input className={input} name="colorExterior" defaultValue={v?.colorExterior ?? ""} />
        </div>
        <div>
          <label className={label}>Interior color</label>
          <input className={input} name="colorInterior" defaultValue={v?.colorInterior ?? ""} />
        </div>
        <div>
          <label className={label}>Condition</label>
          <select className={input} name="condition" defaultValue={v?.condition ?? "USED"}>
            {CONDITIONS.map((x) => (
              <option key={x} value={x}>
                {humanize(x)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Price</label>
          <input className={input} name="price" inputMode="numeric" defaultValue={v?.price?.toString() ?? ""} />
        </div>
        <div>
          <label className={label}>Cost</label>
          <input className={input} name="cost" inputMode="numeric" defaultValue={v?.cost?.toString() ?? ""} />
        </div>
        <div>
          <label className={label}>Status</label>
          <select className={input} name="status" defaultValue={v?.status ?? "IN_STOCK"}>
            {VEHICLE_STATUSES.map((x) => (
              <option key={x} value={x}>
                {humanize(x)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Source</label>
          <select className={input} name="source" defaultValue={v?.source ?? ""}>
            <option value="">—</option>
            {VEHICLE_SOURCES.map((x) => (
              <option key={x} value={x}>
                {humanize(x)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>ETA date</label>
          <input className={input} name="etaDate" type="date" defaultValue={eta} />
        </div>
        <div>
          <label className={label}>Location</label>
          <input className={input} name="location" defaultValue={v?.location ?? ""} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="newExportRestricted"
          defaultChecked={v?.newExportRestricted ?? false}
          className="h-4 w-4 rounded border-slate-300"
        />
        Export-restricted (new-vehicle OEM restriction window) — see compliance note
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton>{editing ? "Save changes" : "Add vehicle"}</SubmitButton>
        <Link href="/inventory" className={btnGhost}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
