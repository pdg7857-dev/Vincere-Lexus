import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

// ─────────────────────────────────────────────────────────────────────────────
// Outbound email transport (reminders, error alerts, and .ics calendar invites).
// A single dedicated SMTP account (e.g. a Gmail App Password). This module never
// touches the user's WORK email account — see §2/§6.
// ─────────────────────────────────────────────────────────────────────────────

let cached: nodemailer.Transporter | null = null;

export function getTransport(): nodemailer.Transporter {
  if (cached) return cached;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error(
      'SMTP not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS in .env',
    );
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')) === 'true';

  cached = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return cached;
}

export function senderAddress(): string {
  return process.env.SENDER_EMAIL || process.env.SMTP_USER || '';
}

export function notifyAddress(): string {
  return process.env.NOTIFY_EMAIL || senderAddress();
}

/** Low-level send. Throws on failure so callers can log + retry. */
export async function sendMail(opts: Mail.Options): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({ from: senderAddress(), ...opts });
}

/** A simple reminder email to the user's personal/notify inbox. */
export async function sendReminderEmail(subject: string, body: string): Promise<void> {
  await sendMail({
    to: notifyAddress(),
    subject,
    text: body,
    html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5">${escapeHtml(
      body,
    ).replace(/\n/g, '<br>')}</div>`,
  });
}

/**
 * Error alert so a silent background-job failure can't go unnoticed (§8).
 * Best-effort: if sending the alert itself fails we swallow it (already logged
 * by the caller) rather than crash the worker.
 */
export async function sendErrorAlert(job: string, detail: string): Promise<void> {
  try {
    await sendMail({
      to: notifyAddress(),
      subject: `⚠️ Task system: "${job}" job failed`,
      text: `The background job "${job}" reported an error:\n\n${detail}\n\nCheck /status for recent job logs.`,
    });
  } catch (e) {
    console.error('[mailer] failed to send error alert:', e);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
