"use client";

import { useActionState } from "react";
import { addActivity } from "@/lib/actions/activities";
import { SubmitButton } from "@/components/SubmitButton";
import { input, label } from "@/lib/ui";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { humanize } from "@/lib/format";
import type { FormState } from "@/lib/forms";

export function NoteForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addActivity, {});
  return (
    <form action={action} className="space-y-3">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <input type="hidden" name="customerId" value={customerId} />
      <div className="flex flex-wrap gap-3">
        <select className={input + " w-auto"} name="type" defaultValue="NOTE">
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {humanize(t)}
            </option>
          ))}
        </select>
        <div className="grow">
          <input
            type="datetime-local"
            name="occurredAt"
            className={input}
            aria-label="When it happened (defaults to now)"
          />
        </div>
      </div>
      <textarea
        className={input}
        name="body"
        rows={3}
        placeholder="Log a call, email, meeting or note…"
        required
      />
      <SubmitButton>Log activity</SubmitButton>
    </form>
  );
}
