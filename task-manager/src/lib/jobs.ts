import { prisma } from './db';
import { sendErrorAlert } from './mailer';

// ─────────────────────────────────────────────────────────────────────────────
// JobLog helpers. Every background job records ok/error here, and errors also
// trigger an email alert so failures are never silent (§8).
// ─────────────────────────────────────────────────────────────────────────────

export type JobName =
  | 'email_poll'
  | 'reminders'
  | 'calendar_send'
  | 'backup'
  | 'enrich';

export async function logJob(
  job: JobName,
  status: 'ok' | 'error',
  detail?: string,
): Promise<void> {
  try {
    await prisma.jobLog.create({ data: { job, status, detail: detail ?? null } });
  } catch (e) {
    // If even logging fails, fall back to stderr — do not throw.
    console.error(`[jobs] failed to write JobLog (${job}/${status}):`, e);
  }
}

/**
 * Run a job body with uniform logging + fail-loud behaviour. Returns the body's
 * result, or null if it threw (the error is logged + emailed, never rethrown to
 * the cron scheduler so the process stays alive).
 */
export async function runJob<T>(
  job: JobName,
  body: () => Promise<T>,
  opts: { notifyOnError?: boolean; okDetail?: (r: T) => string } = {},
): Promise<T | null> {
  const { notifyOnError = true, okDetail } = opts;
  try {
    const result = await body();
    await logJob(job, 'ok', okDetail ? okDetail(result) : undefined);
    return result;
  } catch (e) {
    const detail = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
    console.error(`[jobs] ${job} failed:`, e);
    await logJob(job, 'error', detail);
    if (notifyOnError) await sendErrorAlert(job, detail);
    return null;
  }
}
