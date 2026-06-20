import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { btnPrimary, input, badge, statusColor } from "@/lib/ui";
import { humanize, formatDate } from "@/lib/format";
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  const where: Prisma.CustomerWhereInput = { archivedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { businessName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  if (sp.status) where.status = sp.status as Prisma.CustomerWhereInput["status"];
  if (sp.type) where.type = sp.type as Prisma.CustomerWhereInput["type"];

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { leadSource: true, _count: { select: { wants: true, deals: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <Link href="/customers/new" className={btnPrimary}>
          + New customer
        </Link>
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          className={input + " max-w-xs"}
          name="q"
          placeholder="Search name, business, email, phone…"
          defaultValue={q ?? ""}
        />
        <select className={input + " w-auto"} name="status" defaultValue={sp.status ?? ""}>
          <option value="">Any status</option>
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <select className={input + " w-auto"} name="type" defaultValue={sp.type ?? ""}>
          <option value="">Any type</option>
          {CUSTOMER_TYPES.map((t) => (
            <option key={t} value={t}>
              {humanize(t)}
            </option>
          ))}
        </select>
        <button className={btnPrimary}>Search</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3 text-right">Wants / Deals</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  {c.businessName && (
                    <p className="text-xs text-slate-400">{c.businessName}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{humanize(c.type)}</td>
                <td className="px-4 py-3">
                  <span className={badge + " " + (statusColor[c.status] ?? "")}>
                    {humanize(c.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.email ?? c.phone ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">{c.leadSource?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {c._count.wants} / {c._count.deals}
                </td>
                <td className="px-4 py-3 text-slate-400">{formatDate(c.updatedAt)}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No customers found.{" "}
                  <Link href="/customers/new" className="text-slate-700 underline">
                    Add one
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
