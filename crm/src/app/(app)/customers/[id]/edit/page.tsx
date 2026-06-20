import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { card } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, leadSources] = await Promise.all([
    prisma.customer.findFirst({ where: { id, archivedAt: null } }),
    prisma.leadSource.findMany({
      where: { archivedAt: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/customers/${id}`} className="text-sm text-slate-500 hover:underline">
          ← {customer.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Edit customer</h1>
      </div>
      <div className={card}>
        <CustomerForm leadSources={leadSources} customer={customer} />
      </div>
    </div>
  );
}
