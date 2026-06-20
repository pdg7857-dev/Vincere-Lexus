"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Customer } from "@prisma/client";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { SubmitButton } from "@/components/SubmitButton";
import { Err } from "@/components/forms/Err";
import { input, label, btnGhost } from "@/lib/ui";
import {
  CUSTOMER_TYPES,
  CUSTOMER_STATUSES,
  PAYMENT_METHODS,
} from "@/lib/constants";
import { humanize } from "@/lib/format";
import type { FormState } from "@/lib/forms";

export function CustomerForm({
  leadSources,
  customer,
}: {
  leadSources: { id: string; name: string }[];
  customer?: Customer;
}) {
  const editing = Boolean(customer);
  const [state, action] = useActionState<FormState, FormData>(
    editing ? updateCustomer : createCustomer,
    {},
  );
  const c = customer;

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {editing && <input type="hidden" name="id" value={c!.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Name *</label>
          <input className={input} name="name" defaultValue={c?.name ?? ""} required />
          <Err msg={state?.fieldErrors?.name} />
        </div>
        <div>
          <label className={label}>Business name</label>
          <input
            className={input}
            name="businessName"
            defaultValue={c?.businessName ?? ""}
          />
        </div>
        <div>
          <label className={label}>Type</label>
          <select className={input} name="type" defaultValue={c?.type ?? "PERSONAL"}>
            {CUSTOMER_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Phone</label>
          <input className={input} name="phone" defaultValue={c?.phone ?? ""} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input
            className={input}
            name="email"
            type="email"
            defaultValue={c?.email ?? ""}
          />
          <Err msg={state?.fieldErrors?.email} />
        </div>
        <div>
          <label className={label}>Status</label>
          <select className={input} name="status" defaultValue={c?.status ?? "LEAD"}>
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Lead source</label>
          <select
            className={input}
            name="leadSourceId"
            defaultValue={c?.leadSourceId ?? ""}
          >
            <option value="">—</option>
            {leadSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Preferred channel</label>
          <input
            className={input}
            name="preferredChannel"
            placeholder="phone / email / text / WhatsApp"
            defaultValue={c?.preferredChannel ?? ""}
          />
        </div>
        <div>
          <label className={label}>Language</label>
          <input className={input} name="language" defaultValue={c?.language ?? ""} />
        </div>
        <div>
          <label className={label}>Payment method</label>
          <select
            className={input}
            name="paymentMethod"
            defaultValue={c?.paymentMethod ?? ""}
          >
            <option value="">—</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {humanize(p)}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Tags (comma-separated)</label>
          <input
            className={input}
            name="tags"
            placeholder="exporter, repeat, RX shopper"
            defaultValue={c?.tags?.join(", ") ?? ""}
          />
        </div>
      </div>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Business intel
        </legend>
        <div>
          <label className={label}>What they do with cars</label>
          <textarea
            className={input}
            name="whatTheyDoWithCars"
            rows={2}
            defaultValue={c?.whatTheyDoWithCars ?? ""}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Export destination</label>
            <input
              className={input}
              name="exportDestination"
              defaultValue={c?.exportDestination ?? ""}
            />
          </div>
          <div>
            <label className={label}>Typical volume</label>
            <input
              className={input}
              name="typicalVolume"
              defaultValue={c?.typicalVolume ?? ""}
            />
          </div>
          <div>
            <label className={label}>Buying cadence</label>
            <input
              className={input}
              name="buyingCadence"
              defaultValue={c?.buyingCadence ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="consentToContact"
          defaultChecked={c?.consentToContact ?? false}
          className="h-4 w-4 rounded border-slate-300"
        />
        Consent to contact (PIPEDA) — records the consent date
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton>{editing ? "Save changes" : "Create customer"}</SubmitButton>
        <Link href={editing ? `/customers/${c!.id}` : "/customers"} className={btnGhost}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
