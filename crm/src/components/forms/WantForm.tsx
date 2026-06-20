"use client";

import { useActionState } from "react";
import { createWant } from "@/lib/actions/wants";
import { SubmitButton } from "@/components/SubmitButton";
import { input, label } from "@/lib/ui";
import { CONDITIONS } from "@/lib/constants";
import { humanize } from "@/lib/format";
import type { FormState } from "@/lib/forms";

export function WantForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState<FormState, FormData>(createWant, {});
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <input type="hidden" name="customerId" value={customerId} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label}>Make</label>
          <input className={input} name="make" placeholder="Lexus" />
        </div>
        <div>
          <label className={label}>Model</label>
          <input className={input} name="model" placeholder="RX 350" />
        </div>
        <div>
          <label className={label}>Trim</label>
          <input className={input} name="trim" />
        </div>
        <div>
          <label className={label}>Year min</label>
          <input className={input} name="yearMin" inputMode="numeric" />
        </div>
        <div>
          <label className={label}>Year max</label>
          <input className={input} name="yearMax" inputMode="numeric" />
        </div>
        <div>
          <label className={label}>Condition</label>
          <select className={input} name="condition" defaultValue="ANY">
            {CONDITIONS.map((x) => (
              <option key={x} value={x}>
                {humanize(x)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Max price</label>
          <input className={input} name="priceMax" inputMode="numeric" placeholder="80000" />
        </div>
        <div>
          <label className={label}>Max mileage (km)</label>
          <input className={input} name="mileageMax" inputMode="numeric" />
        </div>
        <div>
          <label className={label}>Quantity</label>
          <input className={input} name="quantity" inputMode="numeric" defaultValue={1} />
        </div>
        <div>
          <label className={label}>Exterior colors</label>
          <input className={input} name="colorExterior" placeholder="white, black" />
        </div>
        <div>
          <label className={label}>Interior colors</label>
          <input className={input} name="colorInterior" placeholder="black, tan" />
        </div>
        <div>
          <label className={label}>Drivetrain</label>
          <input className={input} name="drivetrain" placeholder="AWD" />
        </div>
        <div className="sm:col-span-3">
          <label className={label}>Required options (comma-separated)</label>
          <input
            className={input}
            name="optionsRequired"
            placeholder="Mark Levinson, panoramic roof, tow package"
          />
        </div>
        <div className="sm:col-span-3">
          <label className={label}>Nice-to-have options</label>
          <input className={input} name="optionsNiceToHave" placeholder="heads-up display" />
        </div>
        <div className="sm:col-span-3">
          <label className={label}>Destination / spec notes (exporters)</label>
          <input className={input} name="destinationSpecNotes" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="recurring" className="h-4 w-4 rounded border-slate-300" />
        Recurring (re-arm this want after a match is sold)
      </label>

      <SubmitButton>Add want</SubmitButton>
    </form>
  );
}
