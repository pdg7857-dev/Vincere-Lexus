import Link from "next/link";
import { prisma } from "@/lib/db";
import { setMatchStatus } from "@/lib/actions/matches";
import { card, badge, btnPrimary, btnGhost } from "@/lib/ui";
import { formatMoney, humanize } from "@/lib/format";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  NEW: "bg-violet-50 text-violet-700",
  NOTIFIED: "bg-sky-50 text-sky-700",
  INTERESTED: "bg-emerald-50 text-emerald-700",
};

export default async function MatchesPage() {
  const matches = await prisma.match.findMany({
    where: { status: { in: ["NEW", "NOTIFIED", "INTERESTED"] } },
    include: { want: { include: { customer: true } }, vehicle: true },
    orderBy: [{ status: "asc" }, { score: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Match inbox</h1>
        <p className="text-sm text-slate-500">
          Vehicles matched to customer wants, ranked by fit. Mark interested / passed,
          or sold when it closes.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className={card + " text-center text-slate-400"}>
          No active matches. They appear as you add wants and vehicles.
        </div>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => {
            const v = m.vehicle;
            const soft = ((m.matchedFields as { soft?: Record<string, unknown> })?.soft) ?? {};
            const chips = Object.entries(soft)
              .filter(([, val]) => val)
              .map(([k, val]) => `${k}: ${String(val)}`);
            return (
              <li key={m.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/customers/${m.want.customerId}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {m.want.customer.name}
                      </Link>
                      <span className={badge + " " + (statusColor[m.status] ?? "")}>
                        {humanize(m.status)}
                      </span>
                      <span className={badge + " bg-slate-900 text-white"}>
                        score {Math.round(m.score)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {[v.year, v.make, v.model, v.trim].filter(Boolean).join(" ")}
                      {v.stockNumber && (
                        <span className="font-normal text-slate-400"> · #{v.stockNumber}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[
                        formatMoney(v.price),
                        v.colorExterior,
                        v.mileage != null ? `${v.mileage.toLocaleString()} km` : null,
                        humanize(v.condition),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Want:{" "}
                      {[m.want.make, m.want.model, m.want.trim].filter(Boolean).join(" ") ||
                        "any"}
                      {m.want.priceMax ? ` ≤ ${formatMoney(m.want.priceMax)}` : ""}
                    </p>
                    {chips.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {chips.map((c) => (
                          <span key={c} className={badge + " bg-emerald-50 text-emerald-700"}>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {m.status !== "INTERESTED" && (
                      <form action={setMatchStatus.bind(null, m.id, "INTERESTED")}>
                        <button className={btnPrimary}>Interested</button>
                      </form>
                    )}
                    <form action={setMatchStatus.bind(null, m.id, "SOLD")}>
                      <button className={btnGhost}>Sold</button>
                    </form>
                    <form action={setMatchStatus.bind(null, m.id, "PASSED")}>
                      <button className={btnGhost}>Pass</button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
