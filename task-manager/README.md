# Task Capture & Reminder System

A personal, single-user task manager. Drop tasks all day via a **web dashboard**
or by **emailing a dedicated inbox**; each task is parsed for a due date and
priority with the Anthropic API, organized on the dashboard, and surfaced via
**email reminders**. Tasks flagged as meetings are delivered to your **work
Outlook calendar** as a standards-compliant `.ics` invite — without ever
touching your work account.

Built for reliability: **every input is persisted before any parsing runs**, email
processing is **idempotent**, background jobs **fail loud** (logged + emailed),
and the DB is **backed up daily**.

---

## Architecture

```
Web quick-add ─┐
               ├─► Next.js API ─► SQLite (Prisma) ─► Anthropic enrichment
Email inbox  ──┘        ▲                │
   (IMAP poll)          │                ▼
                   cron worker ───► reminders (email) + calendar invites (.ics)
                        │
                        └────────► daily DB backup
```

- **Next.js (App Router, TypeScript)** — dashboard + API routes (`src/app`).
- **SQLite + Prisma** — single-file DB (`prisma/dev.db`), trivial to back up.
- **Anthropic API** (`claude-sonnet-4-6`) — natural-language parsing (`src/lib/anthropic.ts`).
- **nodemailer** — reminder emails + `.ics` calendar invites.
- **imapflow + mailparser** — inbound task email ingestion.
- **node-cron** — schedules the email poll, reminder engine, and backups (`worker/index.ts`).

### Key source files

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | Data model (Task, ProcessedEmail, JobLog) |
| `src/lib/tasks.ts` | Raw-save-then-enrich pipeline (never loses a task) |
| `src/lib/anthropic.ts` | NL → structured fields, with a fail-safe default |
| `src/lib/imap.ts` | Idempotent email ingestion (dedupe on Message-ID) |
| `src/lib/reminders.ts` | Reminder policy + engine |
| `src/lib/calendar.ts` | Outlook `.ics` invite generation + send |
| `src/lib/config.ts` | **All tunable policy** (reminder offsets, cron, backups) |
| `worker/index.ts` | Cron worker (email poll / reminders / backup) |
| `src/app/api/*` | REST API for the dashboard |
| `src/app/page.tsx` | Dashboard UI |
| `src/app/status` + `/api/status` | Health surface |

---

## Setup

### 1. Install

```bash
cd task-manager
npm install
```

`npm install` runs `prisma generate` automatically.

### 2. Configure `.env`

```bash
cp .env.example .env
```

Fill in the values (see `.env.example` for the full list):

- `ANTHROPIC_API_KEY` — your Anthropic API key.
- A **dedicated Gmail** (or transactional provider) for sending and receiving — see below.
- `WORK_EMAIL` — where calendar invites are sent (your work Outlook address).
- `NOTIFY_EMAIL` — where reminders + error alerts land (your personal inbox).

### 3. Create the dedicated Gmail + App Password

1. Create a free Gmail, e.g. `yourtasks@gmail.com`. This is the address you'll
   forward/send tasks to and the address the system sends from.
2. Enable **2-Step Verification** on that account.
3. Create an **App Password** (Google Account → Security → App passwords). Use
   the 16-character password as both `SMTP_PASS` and `IMAP_PASS`.
4. Gmail IMAP is enabled by default for App Passwords; if needed, turn it on in
   Gmail → Settings → Forwarding and POP/IMAP → Enable IMAP.
5. Set `SMTP_USER` / `IMAP_USER` / `SENDER_EMAIL` / `INGEST_EMAIL` to that Gmail.

> To send tasks by email, just send or forward a note to `yourtasks@gmail.com`.
> The subject + body become the task text.

### 4. Run migrations

```bash
npm run prisma:migrate    # creates prisma/dev.db and applies the schema
```

### 5. Run it

**Development** (two terminals):

```bash
npm run dev        # Next.js dashboard at http://localhost:3000
npm run worker:dev # cron worker (email poll / reminders / backups)
```

**Production** (pm2, always-on, auto-restart):

```bash
npm run build
npx pm2 start ecosystem.config.js
npx pm2 save
npx pm2 startup    # follow the printed command to persist across reboots
```

`pm2` runs `task-web` (the dashboard) and `task-worker` (the cron jobs). Check
them with `npx pm2 ls` and `npx pm2 logs`.

---

## Using it

- **Quick-add:** type a task in the box and press Enter. It saves instantly and
  the parsed due date / priority fill in a moment later.
- **Filters:** All / Today / This Week / Overdue / By Priority.
- **Upcoming panel:** future-dated tasks at a glance.
- **Per-task actions:** Done, Snooze (+1 day), Calendar, Delete.
- **Keyboard:** focus a task, then `d` = done, `s` = snooze, `1`/`2`/`3` = set priority.
- **Status page:** `/status` shows last poll/reminder/backup times, counts, and recent errors.

### Reminders

Configured in `src/lib/config.ts`:

- Tasks with a due date: reminders at **24h before**, **1h before**, **at due time**
  (high-priority tasks add a **3h-before** nudge).
- High-priority (level 3) tasks with no due date: a **daily morning nudge** until done.

`reminderState` on each task records which reminders already fired so none repeat.

---

## Outlook calendar invites (the security-sensitive part)

The system **never logs into, OAuths into, or stores credentials for your work
email.** When a task needs a calendar event (`needsCalendar=true`, set by the
parser or the **📅 Calendar** button), it generates a standards-compliant
iCalendar `VEVENT` with `METHOD:REQUEST` and emails it from the dedicated sender
to `WORK_EMAIL`. Outlook recognizes it as a meeting invite and offers **Accept**
→ it lands on your calendar. You accept manually.

- Stable `UID` per task (`task-<id>@CALENDAR_UID_DOMAIN`) so updates reconcile.
- `SEQUENCE` increments on updates; re-sending updates the same event.
- A `METHOD:CANCEL` send (`POST /api/tasks/:id/calendar` with `{"method":"CANCEL"}`)
  removes it.

### Test the calendar invite end-to-end

1. Set `WORK_EMAIL` to an address you can check (your work Outlook, or any
   address for a smoke test) and configure SMTP.
2. Add a task like *"Project sync Thursday 2pm"* (the parser should set
   `needsCalendar`), or click **📅 Calendar** on any task.
3. Check `WORK_EMAIL`'s inbox — you should receive a meeting invitation with an
   `invite.ics` attachment and an **Accept** button. Accept it; it appears on the
   calendar.

---

## Reliability notes

- **No task loss:** every web/email input is written to the DB before parsing.
  If parsing fails, the raw text is kept at priority 1 (see `src/lib/anthropic.ts`).
- **Idempotent email:** each `Message-ID` is recorded in `ProcessedEmail`; a
  message is turned into a task exactly once, even across retries.
- **Fail loud:** background job failures are logged to `JobLog` and an alert
  email is sent to `NOTIFY_EMAIL`. View recent errors at `/status`.
- **Backups:** `npm run backup` (and the daily cron job) copy `dev.db` to
  `backups/dev-<timestamp>.db`, keeping the last 7.
- **Supervision:** `ecosystem.config.js` auto-restarts both processes on crash.

---

## Environment variables

See `.env.example`. Required: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `SMTP_*`,
`IMAP_*`, `SENDER_EMAIL`, `NOTIFY_EMAIL`, `WORK_EMAIL`. Optional toggles:
`ENABLE_EMAIL_POLL`, `ENABLE_REMINDERS`, `ENABLE_BACKUP`, `ANTHROPIC_MODEL`,
`CALENDAR_UID_DOMAIN`.

---

## Phase 2 (not yet built)

- `web-push` browser notifications for the dashboard (the reminder engine is
  already structured to add a second delivery channel).
