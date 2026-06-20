"use client";

import Link from "next/link";
import { useTransition } from "react";
import { moveDealStage, archiveDeal } from "@/lib/actions/deals";
import { formatMoney } from "@/lib/format";

type Stage = { id: string; name: string; isWon: boolean; isTerminal: boolean };
type Deal = {
  id: string;
  title: string | null;
  value: string | null; // Decimal serialized to string by the server component
  stageId: string;
  customerName: string;
  customerId: string;
  vehicleLabel: string | null;
};

export function PipelineBoard({
  stages,
  deals,
}: {
  stages: Stage[];
  deals: Deal[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={`flex gap-4 overflow-x-auto pb-4 ${pending ? "opacity-70" : ""}`}>
      {stages.map((stage) => {
        const here = deals.filter((d) => d.stageId === stage.id);
        const total = here.reduce((s, d) => s + (d.value ? Number(d.value) : 0), 0);
        return (
          <div key={stage.id} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-700">
                {stage.name}
                {stage.isWon && " ✓"}
              </h3>
              <span className="text-xs text-slate-400">{here.length}</span>
            </div>
            <div className="mb-2 px-1 text-xs text-slate-400">
              {total > 0 ? formatMoney(total) : " "}
            </div>
            <div className="space-y-2">
              {here.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <Link
                    href={`/customers/${d.customerId}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    {d.customerName}
                  </Link>
                  {d.title && <p className="text-xs text-slate-500">{d.title}</p>}
                  {d.vehicleLabel && (
                    <p className="mt-1 text-xs text-slate-500">🚗 {d.vehicleLabel}</p>
                  )}
                  {d.value && (
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatMoney(d.value)}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      className="grow rounded border border-slate-200 px-2 py-1 text-xs"
                      value={d.stageId}
                      onChange={(e) =>
                        startTransition(() => moveDealStage(d.id, e.target.value))
                      }
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      title="Archive deal"
                      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-400 hover:text-red-600"
                      onClick={() => {
                        if (window.confirm("Archive this deal?"))
                          startTransition(() => archiveDeal(d.id));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {here.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-300">
                  Empty
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
