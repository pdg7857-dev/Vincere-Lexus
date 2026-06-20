import Link from "next/link";
import { prisma } from "@/lib/db";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { card } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const leadSources = await prisma.leadSource.findMany({
    where: { archivedAt: null },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/customers" className="text-sm text-slate-500 hover:underline">
          ← Customers
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">New customer</h1>
      </div>
      <div className={card}>
        <CustomerForm leadSources={leadSources} />
      </div>
    </div>
  );
}
