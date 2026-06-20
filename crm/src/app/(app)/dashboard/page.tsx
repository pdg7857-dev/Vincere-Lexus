import Link from "next/link";
import { prisma } from "@/lib/db";
import { card, badge, statusColor } from "@/lib/ui";
import { formatMoney, humanize, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className={card + " transition hover:shadow-md"}>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const [customers, activeWants, inStock, openDeals, recentCustomers, recentActivities, stages, deals] =
    await Promise.all([
      prisma.customer.count({ where: { archivedAt: null } }),
      prisma.want.count({ where: { archivedAt: null, active: true } }),
      prisma.vehicle.count({
        where: { archivedAt: null, status: { in: ["IN_STOCK", "ARRIVED", "ALLOCATED"] } },
      }),
      prisma.deal.count({ where: { archivedAt: null, stage: { isTerminal: false } } }),
      prisma.customer.findMany({
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { leadSource: true },
      }),
      prisma.activity.findMany({
        where: { archivedAt: null },
        orderBy: { occurredAt: "desc" },
        take: 6,
        include: { customer: true },
      }),
      prisma.stage.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" } }),
      prisma.deal.findMany({ where: { archivedAt: null }, include: { stage: true } }),
    ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Customers" value={customers} href="/customers" />
        <Stat label="Active wants" value={activeWants} href="/customers" />
        <Stat label="Vehicles available" value={inStock} href="/inventory" />
        <Stat label="Open deals" value={openDeals} href="/pipeline" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 font-semibold text-slate-800">Pipeline snapshot</h2>
          <ul className="space-y-2">
            {stages.map((s) => {
              const here = deals.filter((d) => d.stageId === s.id);
              const val = here.reduce((a, d) => a + (d.value ? Number(d.value) : 0), 0);
              return (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{s.name}</span>
                  <span className="text-slate-400">
                    {here.length} {val > 0 && `· ${formatMoney(val)}`}
                  </span>
                </li>
              );
            })}
            {deals.length === 0 && (
              <li className="text-sm text-slate-400">No deals yet.</li>
            )}
          </ul>
        </section>

        <section className={card}>
          <h2 className="mb-3 font-semibold text-slate-800">Recent intake</h2>
          <ul className="space-y-2">
            {recentCustomers.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <Link href={`/customers/${c.id}`} className="text-slate-700 hover:underline">
                  {c.name}
                </Link>
                <span className={badge + " " + (statusColor[c.status] ?? "")}>
                  {humanize(c.status)}
                </span>
              </li>
            ))}
            {recentCustomers.length === 0 && (
              <li className="text-sm text-slate-400">No customers yet.</li>
            )}
          </ul>
        </section>
      </div>

      <section className={card}>
        <h2 className="mb-3 font-semibold text-slate-800">Recent activity</h2>
        <ul className="space-y-3">
          {recentActivities.map((a) => (
            <li key={a.id} className="text-sm">
              <div className="flex items-center justify-between">
                <Link href={`/customers/${a.customerId}`} className="font-medium hover:underline">
                  {a.customer.name}
                </Link>
                <span className="text-xs text-slate-400">
                  {humanize(a.type)} · {timeAgo(a.occurredAt)}
                </span>
              </div>
              {a.body && <p className="mt-0.5 line-clamp-2 text-slate-500">{a.body}</p>}
            </li>
          ))}
          {recentActivities.length === 0 && (
            <li className="text-sm text-slate-400">No activity logged yet.</li>
          )}
        </ul>
      </section>

      <p className="text-xs text-slate-400">
        Vehicle-match alerts and follow-up reminders arrive in Phase 3 (matching engine).
      </p>
    </div>
  );
}
