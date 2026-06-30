// ─────────────────────────────────────────────────────────────────────────────
// Central configuration / tunable constants.
// All reminder policy lives here so it is changed in exactly one place (§7).
// ─────────────────────────────────────────────────────────────────────────────

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// Default meeting duration when a calendar event time is set but no end is known.
export const DEFAULT_EVENT_DURATION_MIN = 45;

// ── Reminder policy ──────────────────────────────────────────────────────────
// Offsets (in minutes BEFORE the due date) at which a reminder fires for a task
// that has a due date. `0` means "at due time". Each entry has a stable `key`
// recorded in Task.reminderState so it never fires twice.
export interface ReminderRule {
  key: string;
  minutesBefore: number;
  // Only applies to tasks with priority >= this value.
  minPriority?: number;
}

export const DUE_DATE_REMINDERS: ReminderRule[] = [
  { key: 'd-24h', minutesBefore: 24 * 60 },
  { key: 'd-3h', minutesBefore: 3 * 60, minPriority: 3 }, // earlier nudge for high priority
  { key: 'd-1h', minutesBefore: 60 },
  { key: 'd-0', minutesBefore: 0 },
];

// A high-priority (level 3) task with NO due date gets a daily morning nudge.
export const NO_DUE_DAILY_NUDGE = {
  // local hour of day (24h) to send the nudge; the reminder engine fires the
  // nudge the first time it runs at or after this hour each day.
  hour: 8,
  // priority threshold for the daily nudge
  minPriority: 3,
  // key prefix; the actual recorded key is `nudge-YYYY-MM-DD`
  keyPrefix: 'nudge',
};

// How far ahead the "Upcoming" panel looks (days).
export const UPCOMING_WINDOW_DAYS = 14;

// ── Backups ──────────────────────────────────────────────────────────────────
export const BACKUP_KEEP = 7; // keep last N daily backups

// ── Cron schedules (node-cron syntax) ────────────────────────────────────────
export const CRON_EMAIL_POLL = '*/2 * * * *'; // every 2 minutes
export const CRON_REMINDERS = '*/5 * * * *'; // every 5 minutes
export const CRON_BACKUP = '15 3 * * *'; // 03:15 daily

// Feature toggles (worker reads these).
export const flags = {
  emailPoll: (process.env.ENABLE_EMAIL_POLL ?? 'true') !== 'false',
  reminders: (process.env.ENABLE_REMINDERS ?? 'true') !== 'false',
  backup: (process.env.ENABLE_BACKUP ?? 'true') !== 'false',
};
