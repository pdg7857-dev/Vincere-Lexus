import cron from 'node-cron';
import { config as loadEnv } from 'dotenv';
import { runJob } from '../src/lib/jobs';
import { pollInboxOnce } from '../src/lib/imap';
import { runReminderPass } from '../src/lib/reminders';
import { sweepPendingCalendarInvites } from '../src/lib/calendar';
import { runBackup } from '../scripts/backup';
import {
  CRON_EMAIL_POLL,
  CRON_REMINDERS,
  CRON_BACKUP,
  flags,
} from '../src/lib/config';

// Load .env for the standalone worker process (Next loads it automatically).
loadEnv();

// ─────────────────────────────────────────────────────────────────────────────
// Background worker (§5.4 / §7 / §8). Runs the cron jobs that keep the system
// alive: email ingestion, the reminder engine + calendar sweep, and DB backups.
//
// Fail-loud, never-crash: every job body runs inside runJob(), which logs to
// JobLog and emails an alert on failure but never lets an exception escape to
// node-cron. A single overlap guard prevents a slow run from stacking.
// ─────────────────────────────────────────────────────────────────────────────

const running = new Set<string>();

function guarded(name: string, fn: () => Promise<unknown>) {
  return async () => {
    if (running.has(name)) {
      console.warn(`[worker] skip ${name}: previous run still in progress`);
      return;
    }
    running.add(name);
    try {
      await fn();
    } finally {
      running.delete(name);
    }
  };
}

function start() {
  console.log('[worker] starting cron jobs');

  if (flags.emailPoll) {
    cron.schedule(
      CRON_EMAIL_POLL,
      guarded('email_poll', () =>
        runJob('email_poll', () => pollInboxOnce(), {
          okDetail: (n) => `created ${n} task(s)`,
        }),
      ),
    );
    console.log(`[worker]  email poll:  ${CRON_EMAIL_POLL}`);
  }

  if (flags.reminders) {
    cron.schedule(
      CRON_REMINDERS,
      guarded('reminders', async () => {
        // Reminder pass + calendar invite sweep run together every ~5 min.
        await runJob('reminders', () => runReminderPass(), {
          okDetail: (n) => `sent ${n} reminder(s)`,
        });
        await runJob('calendar_send', () => sweepPendingCalendarInvites(), {
          okDetail: (n) => `sent ${n} invite(s)`,
          // calendar errors are already logged per-task; avoid double-alerting
          notifyOnError: false,
        });
      }),
    );
    console.log(`[worker]  reminders:   ${CRON_REMINDERS}`);
  }

  if (flags.backup) {
    cron.schedule(
      CRON_BACKUP,
      guarded('backup', () =>
        runJob('backup', () => runBackup(), { okDetail: (p) => `backup -> ${p}` }),
      ),
    );
    console.log(`[worker]  backup:      ${CRON_BACKUP}`);
  }

  // Run an immediate email poll + reminder pass on boot so we don't wait a
  // full cycle after a restart.
  if (flags.emailPoll) {
    void runJob('email_poll', () => pollInboxOnce(), {
      okDetail: (n) => `created ${n} task(s)`,
    });
  }
  if (flags.reminders) {
    void runJob('reminders', () => runReminderPass(), {
      okDetail: (n) => `sent ${n} reminder(s)`,
    });
  }
}

// Don't let an unexpected rejection take down the worker.
process.on('unhandledRejection', (reason) => {
  console.error('[worker] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[worker] uncaughtException:', err);
});

start();
