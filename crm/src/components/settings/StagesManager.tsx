"use client";

import { useActionState } from "react";
import {
  addStage,
  renameStage,
  moveStage,
  archiveStage,
} from "@/lib/actions/settings";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { input, label, btnGhost, btnDanger, badge } from "@/lib/ui";
import type { FormState } from "@/lib/forms";

type Stage = {
  id: string;
  name: string;
  isTerminal: boolean;
  isWon: boolean;
  dealCount: number;
};

function StageRow({ s }: { s: Stage }) {
  const [state, action] = useActionState<FormState, FormData>(renameStage, {});
  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-2">
      <form action={action} className="flex grow items-center gap-2">
        <input type="hidden" name="id" value={s.id} />
        <input className={input} name="name" defaultValue={s.name} />
        <SubmitButton className={btnGhost} pendingLabel="…">
          Rename
        </SubmitButton>
      </form>
      {s.isWon && <span className={badge + " bg-emerald-50 text-emerald-700"}>won</span>}
      {s.isTerminal && <span className={badge + " bg-slate-100 text-slate-500"}>terminal</span>}
      {s.dealCount > 0 && (
        <span className="text-xs text-slate-400">{s.dealCount} deals</span>
      )}
      <form action={moveStage.bind(null, s.id, "up")}>
        <button className={btnGhost} title="Move up">↑</button>
      </form>
      <form action={moveStage.bind(null, s.id, "down")}>
        <button className={btnGhost} title="Move down">↓</button>
      </form>
      <ConfirmSubmit
        action={archiveStage.bind(null, s.id)}
        confirm={`Archive the “${s.name}” stage? (only works if it has no active deals)`}
        className={btnDanger}
      >
        Archive
      </ConfirmSubmit>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </li>
  );
}

export function StagesManager({ stages }: { stages: Stage[] }) {
  const [state, action] = useActionState<FormState, FormData>(addStage, {});
  return (
    <div className="space-y-4">
      <ul>
        {stages.map((s) => (
          <StageRow key={s.id} s={s} />
        ))}
      </ul>
      <form action={action} className="flex flex-wrap items-end gap-3 pt-2">
        <div className="grow">
          <label className={label}>New stage</label>
          <input className={input} name="name" placeholder="e.g. Financing" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="isWon" className="h-4 w-4" /> won
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="isTerminal" className="h-4 w-4" /> terminal
        </label>
        <SubmitButton>Add stage</SubmitButton>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
