// PIPEDA data export: returns everything held about one customer as a JSON
// download. Auth-protected (route handlers self-protect; the proxy skips /api).
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      leadSource: true,
      wants: true,
      activities: true,
      deals: { include: { stage: true, vehicle: true } },
    },
  });
  if (!customer) return new Response("Not found", { status: 404 });

  return new Response(JSON.stringify(customer, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="customer-${id}.json"`,
    },
  });
}
