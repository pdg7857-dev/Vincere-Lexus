// Local intake API — the Claude bridge surface. The bundled MCP server (and any
// trusted local script) POSTs freeform updates here; they run through the same
// intake pipeline as email/web-form. Token-protected via INTAKE_API_TOKEN.
import { runIntake } from "@/lib/intake";
import { intakeAuthorized } from "@/lib/intakeAuth";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import type { ActivityType } from "@prisma/client";

export async function POST(req: Request) {
  if (!intakeAuthorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const body =
    typeof payload.body === "string"
      ? payload.body
      : typeof payload.text === "string"
        ? payload.text
        : "";
  if (!body.trim()) {
    return Response.json({ ok: false, error: "body/text required" }, { status: 400 });
  }

  const rawType = payload.type;
  const type =
    typeof rawType === "string" && (ACTIVITY_TYPES as readonly string[]).includes(rawType)
      ? (rawType as ActivityType)
      : undefined;

  const cust = (payload.customer as Record<string, unknown> | undefined) ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  const result = await runIntake({
    source: "CLAUDE",
    type,
    body,
    subject: str(payload.subject),
    customer: {
      name: str(payload.customerName) ?? str(cust.name),
      email: str(payload.customerEmail) ?? str(cust.email),
      phone: str(payload.customerPhone) ?? str(cust.phone),
    },
    parseSignatureBlock: payload.parseSignature === true,
    rawPayload: payload,
  });

  if (result.ok) {
    revalidatePath("/intake");
    revalidatePath("/customers");
    revalidatePath("/dashboard");
  }
  // A duplicate is a successful no-op (idempotent), not a client error.
  const status = result.ok || result.reason === "duplicate" ? 200 : 400;
  return Response.json(result, { status });
}
