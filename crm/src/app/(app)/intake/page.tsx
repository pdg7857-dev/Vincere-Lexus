import Link from "next/link";
import { prisma } from "@/lib/db";
import { approveIntake, rejectIntake, pollEmailNow } from "@/lib/actions/intake";
import { SubmitButton } from "@/components/SubmitButton";
import { card, badge, btnPrimary, btnGhost } from "@/lib/ui";
import { humanize, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const sourceColor: Record<string, string> = {
  EMAIL_INTAKE: "bg-sky-50 text-sky-700",
  CLAUDE: "bg-violet-50 text-violet-700",
  FORM: "bg-emerald-50 text-emerald-700",
  MANUAL: "bg-slate-100 text-slate-600",
};

export default async function IntakePage() {
  const events = await prisma.intakeEvent.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const customerIds = [...new Set(events.map((e) => e.customerId).filter(Boolean))] as string[];
  const activityIds = [...new Set(events.map((e) => e.activityId).filter(Boolean))] as string[];
  const [customers, activities] = await Promise.all([
    prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, email: true, phone: true, aiUnverifiedFields: true },
    }),
    prisma.activity.findMany({
      where: { id: { in: activityIds } },
      select: { id: true, type: true, summary: true, body: true },
    }),
  ]);
  const cmap = new Map(customers.map((c) => [c.id, c]));
  const amap = new Map(activities.map((a) => [a.id, a]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intake review</h1>
          <p className="text-sm text-slate-500">
            AI-created or updated records awaiting your confirmation.
          </p>
        </div>
        <form action={pollEmailNow}>
          <SubmitButton className={btnGhost} pendingLabel="Polling…">
            Poll inbox now
          </SubmitButton>
        </form>
      </div>

      {events.length === 0 ? (
        <div className={card + " text-center text-slate-400"}>
          Nothing to review. New leads from email or the Claude bridge will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const c = e.customerId ? cmap.get(e.customerId) : null;
            const a = e.activityId ? amap.get(e.activityId) : null;
            const ai = (e.aiExtracted ?? null) as Record<string, unknown> | null;
            return (
              <li key={e.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {c ? (
                        <Link
                          href={`/customers/${c.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {c.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-500">(no customer)</span>
                      )}
                      <span className={badge + " " + (sourceColor[e.source] ?? "")}>
                        {humanize(e.source)}
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(e.createdAt)}</span>
                    </div>
                    {c && (c.email || c.phone) && (
                      <p className="text-xs text-slate-500">
                        {[c.email, c.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {a?.summary && (
                      <p className="mt-1 text-sm text-slate-700">{a.summary}</p>
                    )}
                    {a?.body && !a.summary && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.body}</p>
                    )}
                    {c && c.aiUnverifiedFields.length > 0 && (
                      <p className="mt-1 text-xs text-amber-700">
                        Unverified (AI-filled): {c.aiUnverifiedFields.join(", ")}
                      </p>
                    )}
                    {ai && (
                      <p className="mt-1 text-xs text-slate-400">
                        Signature:{" "}
                        {Object.entries(ai)
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${k}=${String(v)}`)
                          .join(", ") || "—"}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c && (
                      <Link href={`/customers/${c.id}/edit`} className={btnGhost}>
                        Edit
                      </Link>
                    )}
                    <form action={rejectIntake.bind(null, e.id)}>
                      <button className={btnGhost}>Dismiss</button>
                    </form>
                    <form action={approveIntake.bind(null, e.id)}>
                      <button className={btnPrimary}>Approve</button>
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
