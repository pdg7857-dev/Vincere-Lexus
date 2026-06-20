"use client";

import { useActionState } from "react";
import { addLeadSource, archiveLeadSource } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { input, label, btnDanger } from "@/lib/ui";
import type { FormState } from "@/lib/forms";

export function LeadSourcesManager({
  sources,
}: {
  sources: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(addLeadSource, {});
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-slate-100">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2 text-sm">
            <span>{s.name}</span>
            <ConfirmSubmit
              action={archiveLeadSource.bind(null, s.id)}
              confirm={`Remove “${s.name}” from the list?`}
              className={btnDanger}
            >
              Remove
            </ConfirmSubmit>
          </li>
        ))}
      </ul>
      <form action={action} className="flex items-end gap-3 pt-2">
        <div className="grow">
          <label className={label}>New lead source</label>
          <input className={input} name="name" placeholder="e.g. TikTok" />
        </div>
        <SubmitButton>Add</SubmitButton>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
