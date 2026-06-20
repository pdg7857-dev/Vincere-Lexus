// IMAP inbox poller (brief §7B/C). Connects to the inbox configured in .env,
// processes UNSEEN messages through the intake pipeline, dedupes by Message-ID,
// and marks them seen. Used by the background worker (worker.ts) and the
// "Poll now" button in Settings.
//
// Relative imports so the standalone worker can load this without "@/".
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "./db";
import { runIntake } from "./intake";

export function imapConfigured(): boolean {
  return Boolean(
    process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASSWORD,
  );
}

export async function getLastPolled(): Promise<Date | null> {
  const acct = await prisma.emailAccount.findUnique({ where: { id: "main" } });
  return acct?.lastPolledAt ?? null;
}

export async function pollInbox(): Promise<{
  processed: number;
  skipped?: boolean;
  error?: string;
}> {
  if (!imapConfigured()) return { processed: 0, skipped: true };

  const imap = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: { user: process.env.IMAP_USER!, pass: process.env.IMAP_PASSWORD! },
    logger: false,
  });

  let processed = 0;
  try {
    await imap.connect();
    const lock = await imap.getMailboxLock("INBOX");
    const toMarkSeen: number[] = [];
    try {
      for await (const msg of imap.fetch({ seen: false }, { uid: true, source: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const from = parsed.from?.value?.[0];
        const fromEmail = from?.address?.toLowerCase();
        const body =
          parsed.text ||
          (typeof parsed.html === "string" ? parsed.html.replace(/<[^>]+>/g, " ") : "") ||
          "";

        const res = await runIntake({
          source: "EMAIL_INTAKE",
          type: "EMAIL",
          body,
          subject: parsed.subject || undefined,
          customer: { email: fromEmail, name: from?.name || undefined },
          emailMessageId: parsed.messageId || `imap-${msg.uid}`,
          emailFrom: fromEmail,
          parseSignatureBlock: true,
          rawPayload: {
            from: fromEmail,
            subject: parsed.subject,
            date: parsed.date?.toISOString(),
          },
        });
        if (res.ok) processed++;
        toMarkSeen.push(msg.uid); // mark seen regardless, so dupes aren't reprocessed
      }
    } finally {
      lock.release();
    }
    if (toMarkSeen.length) {
      await imap.messageFlagsAdd(toMarkSeen, ["\\Seen"], { uid: true });
    }
    await imap.logout();
  } catch (e) {
    try {
      await imap.logout();
    } catch {
      /* ignore */
    }
    return { processed, error: e instanceof Error ? e.message : String(e) };
  }

  await prisma.emailAccount.upsert({
    where: { id: "main" },
    update: { lastPolledAt: new Date() },
    create: {
      id: "main",
      label: "Main inbox",
      kind: "IMAP_INBOX",
      host: process.env.IMAP_HOST,
      username: process.env.IMAP_USER,
      lastPolledAt: new Date(),
    },
  });

  return { processed };
}
