import type { Task } from '@prisma/client';
import { prisma } from './db';
import { sendReminderEmail } from './mailer';
import { DUE_DATE_REMINDERS, NO_DUE_DAILY_NUDGE } from './config';

// ─────────────────────────────────────────────────────────────────────────────
// Reminder engine (§7). Scans pending tasks and fires email reminders as they
// come due / approach a deadline. reminderState (a CSV of fired keys) ensures no
// reminder repeats. A failed send is simply not recorded, so it retries next run.
// ─────────────────────────────────────────────────────────────────────────────

function firedKeys(task: Task): Set<string> {
  if (!task.reminderState || task.reminderState === 'none') return new Set();
  return new Set(task.reminderState.split(',').filter(Boolean));
}

async function recordFired(taskId: string, current: Set<string>, key: string): Promise<void> {
  current.add(key);
  await prisma.task.update({
    where: { id: taskId },
    data: { reminderState: Array.from(current).join(',') },
  });
}

function formatDue(d: Date | null): string {
  return d ? d.toLocaleString() : 'no due date';
}

/** Reminders that should fire for one task at time `now`, in priority order. */
function dueReminders(task: Task, now: Date): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const fired = firedKeys(task);

  if (task.dueDate) {
    const due = task.dueDate.getTime();
    for (const rule of DUE_DATE_REMINDERS) {
      if (rule.minPriority && task.priority < rule.minPriority) continue;
      if (fired.has(rule.key)) continue;
      const fireAt = due - rule.minutesBefore * 60 * 1000;
      // Fire once we've reached the trigger time (and the due moment hasn't long passed).
      if (now.getTime() >= fireAt) {
        const when =
          rule.minutesBefore === 0
            ? 'is due now'
            : `is due in ~${rule.minutesBefore >= 60 ? `${Math.round(rule.minutesBefore / 60)}h` : `${rule.minutesBefore}m`}`;
        out.push({ key: rule.key, label: when });
      }
    }
  } else if (task.priority >= NO_DUE_DAILY_NUDGE.minPriority) {
    // High-priority, no due date: one nudge per day at/after the configured hour.
    if (now.getHours() >= NO_DUE_DAILY_NUDGE.hour) {
      const dayKey = `${NO_DUE_DAILY_NUDGE.keyPrefix}-${now.toISOString().slice(0, 10)}`;
      if (!fired.has(dayKey)) {
        out.push({ key: dayKey, label: 'is a high-priority task still pending' });
      }
    }
  }

  return out;
}

/**
 * Run one pass of the reminder engine. Returns the number of reminder emails
 * sent. Throws nothing for individual send failures — those are left unrecorded
 * to retry next cycle.
 */
export async function runReminderPass(now: Date = new Date()): Promise<number> {
  const tasks = await prisma.task.findMany({
    where: { status: 'pending' },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    take: 500,
  });

  let sent = 0;
  for (const task of tasks) {
    const toFire = dueReminders(task, now);
    if (toFire.length === 0) continue;

    const fired = firedKeys(task);
    for (const r of toFire) {
      try {
        const pri = ['', 'low', 'medium', 'high'][task.priority] || 'low';
        await sendReminderEmail(
          `⏰ Task reminder (${pri}): ${task.title}`,
          `Your task "${task.title}" ${r.label}.\n\nDue: ${formatDue(task.dueDate)}\nPriority: ${task.priority} (${pri})\n\n${task.notes || ''}`.trim(),
        );
        await recordFired(task.id, fired, r.key);
        sent++;
      } catch {
        // Leave unrecorded; retried next cycle. (Caller's runJob logs the pass.)
      }
    }
  }
  return sent;
}
