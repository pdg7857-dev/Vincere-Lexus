import type { Task } from '@prisma/client';
import { prisma } from './db';
import { parseTask } from './anthropic';
import { logJob } from './jobs';

// ─────────────────────────────────────────────────────────────────────────────
// Task service. Embodies the core invariant (§2/§5.1):
//   (a) persist the raw task FIRST,
//   (b) enrich it as a second step that only UPDATES the row.
// Enrichment never deletes or loses the task.
// ─────────────────────────────────────────────────────────────────────────────

/** Step (a): persist the raw task immediately. Returns the saved row. */
export async function createRawTask(
  rawInput: string,
  source: 'web' | 'email',
): Promise<Task> {
  const clean = rawInput.trim();
  return prisma.task.create({
    data: {
      rawInput: clean,
      title: clean.slice(0, 300) || 'Untitled task',
      source,
    },
  });
}

/**
 * Step (b): enrich an existing task in place. Best-effort — on parser failure
 * the row keeps its raw title at priority 1 (parseTask already returns a safe
 * default and never throws). Returns the updated row, or the original on a DB
 * error during update.
 */
export async function enrichTask(task: Task): Promise<Task> {
  const result = await parseTask(task.rawInput, new Date());
  const p = result.parsed;

  try {
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        title: p.title,
        notes: p.notes,
        priority: p.priority,
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
        needsCalendar: p.needsCalendar,
        calendarEventTime: p.calendarEventTime ? new Date(p.calendarEventTime) : null,
        enriched: true,
      },
    });
    await logJob('enrich', result.ok ? 'ok' : 'error', result.ok ? task.id : result.error);
    return updated;
  } catch (e) {
    // DB update failed — the raw task still exists, so this is recoverable.
    await logJob('enrich', 'error', e instanceof Error ? e.message : String(e));
    return task;
  }
}

/** Convenience used by both web quick-add and email ingestion. */
export async function createAndEnrich(
  rawInput: string,
  source: 'web' | 'email',
): Promise<Task> {
  const task = await createRawTask(rawInput, source);
  return enrichTask(task);
}
