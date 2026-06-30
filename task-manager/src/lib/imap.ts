import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from './db';
import { createRawTask, enrichTask } from './tasks';

// ─────────────────────────────────────────────────────────────────────────────
// Email ingestion (§5.4). Polls the dedicated inbox for UNSEEN messages and
// turns each into a task EXACTLY ONCE (idempotent on Message-ID).
//
// Order of operations per message (so a task is never lost or duplicated):
//   1. Read Message-ID; skip if already in ProcessedEmail.
//   2. In a transaction: insert ProcessedEmail + the raw Task together.
//   3. Mark the message \Seen.
//   4. Enrich the task (best-effort, outside the txn).
// If anything fails mid-way the message stays UNSEEN and is retried next poll;
// the unique Message-ID guard prevents a duplicate task on retry.
// ─────────────────────────────────────────────────────────────────────────────

function imapConfig() {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;
  if (!host || !user || !pass) {
    throw new Error('IMAP not configured: set IMAP_HOST, IMAP_USER, IMAP_PASS');
  }
  return {
    host,
    port: Number(process.env.IMAP_PORT || 993),
    secure: (process.env.IMAP_SECURE ?? 'true') === 'true',
    auth: { user, pass },
    mailbox: process.env.IMAP_MAILBOX || 'INBOX',
    logger: false as const,
  };
}

function combineSubjectBody(subject: string | undefined, body: string | undefined): string {
  const s = (subject || '').trim();
  const b = (body || '').trim();
  if (s && b) return `${s}\n\n${b}`;
  return s || b || '(empty email)';
}

/**
 * Poll the inbox once. Returns number of new tasks created.
 * Throws on connection-level failure so the caller (runJob) logs + alerts; the
 * process is never crashed because the caller swallows it.
 */
export async function pollInboxOnce(): Promise<number> {
  const cfg = imapConfig();
  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.auth,
    logger: false,
  });

  let created = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock(cfg.mailbox);
    try {
      // Fetch UNSEEN messages with their source so we can parse robustly.
      const unseen = await client.search({ seen: false });
      if (!unseen || unseen.length === 0) return 0;

      for await (const msg of client.fetch(unseen, { source: true, envelope: true, uid: true })) {
        const parsed = await simpleParser(msg.source as Buffer);
        const messageId =
          parsed.messageId ||
          msg.envelope?.messageId ||
          `imap-uid-${cfg.mailbox}-${msg.uid}`; // last-resort stable key

        // 1. Dedupe.
        const seen = await prisma.processedEmail.findUnique({ where: { messageId } });
        if (seen) {
          await client.messageFlagsAdd(String(msg.uid), ['\\Seen'], { uid: true });
          continue;
        }

        const raw = combineSubjectBody(
          parsed.subject || msg.envelope?.subject || undefined,
          parsed.text || stripHtml(parsed.html) || undefined,
        );

        // 2. Insert ProcessedEmail + Task atomically.
        let taskId: string | null = null;
        try {
          await prisma.$transaction(async (tx) => {
            await tx.processedEmail.create({ data: { messageId } });
            const task = await tx.task.create({
              data: {
                rawInput: raw,
                title: raw.slice(0, 300) || 'Untitled task',
                source: 'email',
              },
            });
            taskId = task.id;
          });
        } catch (e) {
          // Unique-constraint race (another poll inserted it) => already handled.
          // Any other error: leave UNSEEN to retry. Do not crash the loop.
          const m = e instanceof Error ? e.message : String(e);
          if (!m.includes('Unique constraint')) {
            // eslint-disable-next-line no-console
            console.error('[imap] failed to persist task for', messageId, m);
          }
          continue;
        }

        // 3. Mark seen now that it's safely persisted.
        await client.messageFlagsAdd(String(msg.uid), ['\\Seen'], { uid: true });
        created++;

        // 4. Enrich (best-effort, never blocks ingestion of the next message).
        if (taskId) {
          const task = await prisma.task.findUnique({ where: { id: taskId } });
          if (task) await enrichTask(task);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }

  return created;
}

function stripHtml(html: string | false | undefined): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Re-export for symmetry with other modules that may want the raw-create path.
export { createRawTask };
