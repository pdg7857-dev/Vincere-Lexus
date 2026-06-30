import type { Task } from '@prisma/client';
import { prisma } from './db';
import { sendMail, senderAddress } from './mailer';
import { logJob } from './jobs';
import { DEFAULT_EVENT_DURATION_MIN } from './config';

// ─────────────────────────────────────────────────────────────────────────────
// Outlook calendar invite via a standards-compliant iCalendar VEVENT with
// METHOD:REQUEST, emailed from the dedicated sender to the user's WORK email (§6).
//
// SECURITY: we never log into / OAuth into the work account. The invite is a
// normal meeting-request email; the user clicks "Accept" in Outlook.
// ─────────────────────────────────────────────────────────────────────────────

function uidDomain(): string {
  return process.env.CALENDAR_UID_DOMAIN || 'tasks.local';
}

function workEmail(): string {
  const w = process.env.WORK_EMAIL;
  if (!w) throw new Error('WORK_EMAIL is not set — cannot address the calendar invite');
  return w;
}

/** iCalendar UTC timestamp: YYYYMMDDTHHMMSSZ */
function fmtICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Fold/escape text per RFC 5545 (commas, semicolons, newlines, backslashes). */
function escapeICSText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export type ICSMethod = 'REQUEST' | 'CANCEL';

interface BuildOpts {
  task: Task;
  method: ICSMethod;
  sequence: number;
  start: Date;
  end: Date;
}

/** Build a single-VEVENT iCalendar document. */
export function buildICS({ task, method, sequence, start, end }: BuildOpts): string {
  const organizer = senderAddress();
  const attendee = workEmail();
  const uid = `task-${task.id}@${uidDomain()}`;
  const status = method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED';

  // DTSTAMP must reflect "now"; Outlook uses SEQUENCE+UID to reconcile updates.
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Task Capture & Reminder System//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${fmtICSDate(new Date())}`,
    `DTSTART:${fmtICSDate(start)}`,
    `DTEND:${fmtICSDate(end)}`,
    `SUMMARY:${escapeICSText(task.title)}`,
    `DESCRIPTION:${escapeICSText(task.notes || task.rawInput)}`,
    `ORGANIZER;CN=Task System:mailto:${organizer}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendee}:mailto:${attendee}`,
    `STATUS:${status}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // RFC 5545 line endings are CRLF.
  return lines.join('\r\n');
}

function resolveTimes(task: Task): { start: Date; end: Date } {
  const start = task.calendarEventTime ?? task.dueDate ?? new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MIN * 60 * 1000);
  return { start, end };
}

/**
 * Send (or update) the calendar invite for a task. Idempotency is enforced by
 * the caller via `force`: the automatic path only fires when calendarSent=false.
 * On success sets calendarSent=true and bumps the SEQUENCE for future updates.
 */
export async function sendCalendarInvite(
  task: Task,
  opts: { method?: ICSMethod; force?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const method = opts.method ?? 'REQUEST';

  // Idempotency guard for the automatic REQUEST path (§6).
  if (method === 'REQUEST' && task.calendarSent && !opts.force) {
    return { ok: true };
  }

  try {
    const { start, end } = resolveTimes(task);
    // Updates re-use the same UID with a higher SEQUENCE.
    const sequence = task.calendarSent ? task.calendarSequence + 1 : task.calendarSequence;
    const ics = buildICS({ task, method, sequence, start, end });

    await sendMail({
      to: workEmail(),
      subject:
        method === 'CANCEL'
          ? `Cancelled: ${task.title}`
          : task.calendarSent
            ? `Updated: ${task.title}`
            : task.title,
      text:
        method === 'CANCEL'
          ? `The meeting "${task.title}" has been cancelled.`
          : `Meeting invitation: ${task.title}\n\n${task.notes || ''}\n\nAccept in Outlook to add it to your calendar.`,
      icalEvent: {
        method,
        content: ics,
        filename: 'invite.ics',
      },
    });

    if (method === 'CANCEL') {
      await prisma.task.update({
        where: { id: task.id },
        data: { calendarSent: false, calendarSequence: sequence },
      });
    } else {
      await prisma.task.update({
        where: { id: task.id },
        data: { calendarSent: true, calendarSequence: sequence },
      });
    }

    await logJob('calendar_send', 'ok', `${method} task=${task.id} seq=${sequence}`);
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await logJob('calendar_send', 'error', `task=${task.id}: ${error}`);
    return { ok: false, error };
  }
}

/**
 * Scan for tasks that should auto-emit an invite: needsCalendar && !calendarSent.
 * Returns count sent. Used by the reminder/cron pipeline.
 */
export async function sweepPendingCalendarInvites(): Promise<number> {
  const due = await prisma.task.findMany({
    where: { needsCalendar: true, calendarSent: false, status: { not: 'done' } },
    take: 50,
  });
  let sent = 0;
  for (const task of due) {
    const r = await sendCalendarInvite(task);
    if (r.ok) sent++;
  }
  return sent;
}
