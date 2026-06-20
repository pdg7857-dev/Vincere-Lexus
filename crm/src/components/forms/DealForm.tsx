"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createDeal } from "@/lib/actions/deals";
import { SubmitButton } from "@/components/SubmitButton";
import { Err } from "@/components/forms/Err";
import { input, label, btnGhost } from "@/lib/ui";
import type { FormState } from "@/lib/forms";

export function DealForm({
  customers,
  stages,
  vehicles,
  customerId,
}: {
  customers: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  vehicles: { id: string; label: string }[];
  customerId?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(createDeal, {});
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Customer *</label>
          <select className={input} name="customerId" defaultValue={customerId ?? ""} required>
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Err msg={state?.fieldErrors?.customerId} />
        </div>
        <div>
          <label className={label}>Stage *</label>
          <select className={input} name="stageId" defaultValue={stages[0]?.id ?? ""} required>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Vehicle (optional)</label>
          <select className={input} name="vehicleId" defaultValue="">
            <option value="">—</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Title</label>
          <input className={input} name="title" placeholder="e.g. RX 350 for export" />
        </div>
        <div>
          <label className={label}>Value</label>
          <input className={input} name="value" inputMode="numeric" />
        </div>
        <div>
          <label className={label}>Deposit</label>
          <input className={input} name="depositAmount" inputMode="numeric" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Notes</label>
          <textarea className={input} name="notes" rows={2} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>Create deal</SubmitButton>
        <Link href="/pipeline" className={btnGhost}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
