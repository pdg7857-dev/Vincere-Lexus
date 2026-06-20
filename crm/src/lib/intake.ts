// The intake pipeline (brief §7). Shared by all three channels:
//   - web form          (source FORM)
//   - email intake      (source EMAIL_INTAKE — forwarded address / IMAP poll)
//   - the Claude bridge (source CLAUDE — text updates via the local API/MCP)
//
// Steps: match the sender first; attach an Activity (with AI summary) to the
// matched customer, or create a new one with AI signature autofill (flagged
// unverified). Always log the raw body. Never auto-reply. Records an
// IntakeEvent for the review queue when human confirmation is warranted.
//
// Uses RELATIVE imports (./db, ./ai) so the standalone worker (tsx worker.ts)
// can load it without the Next "@/" path alias.
import { Prisma, type ActivitySource, type ActivityType } from "@prisma/client";
import { prisma } from "./db";
import { parseSignature, summarize, aiEnabled, type Signature } from "./ai";

export type IntakeInput = {
  source: ActivitySource;
  type?: ActivityType;
  body: string;
  subject?: string;
  customer?: { name?: string; email?: string; phone?: string };
  emailMessageId?: string;
  emailFrom?: string;
  parseSignatureBlock?: boolean; // true for emails
  rawPayload?: unknown;
};

export type IntakeResult =
  | { ok: true; customerId: string; activityId: string; created: boolean; intakeEventId: string }
  | { ok: false; reason: string };

export async function runIntake(input: IntakeInput): Promise<IntakeResult> {
  const email = input.customer?.email?.toLowerCase().trim() || undefined;
  const phone = input.customer?.phone?.trim() || undefined;
  let name = input.customer?.name?.trim() || undefined;

  // Dedupe pulled emails by Message-ID (Activity.emailMessageId is unique).
  if (input.emailMessageId) {
    const dupe = await prisma.activity.findUnique({
      where: { emailMessageId: input.emailMessageId },
    });
    if (dupe) return { ok: false, reason: "duplicate" };
  }

  // 1. Match first: email → phone → exact name (non-archived).
  let customer = email
    ? await prisma.customer.findFirst({ where: { archivedAt: null, email } })
    : null;
  if (!customer && phone) {
    customer = await prisma.customer.findFirst({ where: { archivedAt: null, phone } });
  }
  if (!customer && name) {
    customer = await prisma.customer.findFirst({
      where: { archivedAt: null, name: { equals: name, mode: "insensitive" } },
    });
  }

  let created = false;
  const aiFields: string[] = [];
  let aiExtracted: Signature | null = null;

  if (!customer) {
    // 2. Signature autofill for new records from emails.
    if (input.parseSignatureBlock && aiEnabled()) {
      aiExtracted = await parseSignature(input.body);
    }
    if (!name) name = aiExtracted?.name;
    if (!name && email) name = email.split("@")[0];
    if (!name) name = "Unknown (intake)";

    if (aiExtracted?.name && !input.customer?.name) aiFields.push("name");
    if (aiExtracted?.company) aiFields.push("businessName");
    if (aiExtracted?.phone && !phone) aiFields.push("phone");
    if (aiExtracted?.email && !email) aiFields.push("email");

    const data: Prisma.CustomerUncheckedCreateInput = {
      name,
      email: email ?? aiExtracted?.email ?? null,
      phone: phone ?? aiExtracted?.phone ?? null,
      businessName: aiExtracted?.company ?? null,
      source: input.source,
      needsReview: true,
      aiUnverifiedFields: aiFields,
    };
    customer = await prisma.customer.create({ data });
    created = true;
  }

  // 3. AI summary + log the activity (raw body always retained).
  const summary = aiEnabled()
    ? await summarize(input.body, input.subject ? `Subject: ${input.subject}` : "")
    : null;

  const activity = await prisma.activity.create({
    data: {
      customerId: customer.id,
      type: input.type ?? "NOTE",
      body: input.body,
      summary: summary ?? null,
      source: input.source,
      emailMessageId: input.emailMessageId ?? null,
      emailFrom: input.emailFrom ?? null,
      emailSubject: input.subject ?? null,
    },
  });

  // 4. Review queue: PENDING when a record was created or AI filled fields.
  const needsReview = created || aiFields.length > 0;
  const event = await prisma.intakeEvent.create({
    data: {
      source: input.source,
      rawPayload: (input.rawPayload ?? {
        body: input.body,
        subject: input.subject,
        customer: input.customer,
      }) as Prisma.InputJsonValue,
      ...(aiExtracted ? { aiExtracted: aiExtracted as Prisma.InputJsonValue } : {}),
      status: needsReview ? "PENDING" : "APPROVED",
      customerId: customer.id,
      activityId: activity.id,
      resolvedAt: needsReview ? null : new Date(),
    },
  });

  return {
    ok: true,
    customerId: customer.id,
    activityId: activity.id,
    created,
    intakeEventId: event.id,
  };
}
