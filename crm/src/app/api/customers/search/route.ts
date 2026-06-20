// Token-protected customer lookup for the Claude bridge / MCP server.
import { prisma } from "@/lib/db";
import { intakeAuthorized } from "@/lib/intakeAuth";

export async function GET(req: Request) {
  if (!intakeAuthorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ ok: true, results: [] });

  const results = await prisma.customer.findMany({
    where: {
      archivedAt: null,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { businessName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    take: 10,
    select: { id: true, name: true, businessName: true, email: true, phone: true, status: true },
  });

  return Response.json({ ok: true, results });
}
