# Vincere CRM — Build Prompt (standalone, local-first)

> Paste everything below the line into Claude Code, running **locally on your own
> machine**, to build the app from scratch. It is a complete, self-contained spec and
> already reflects every decision made during scoping — nothing to re-answer.
>
> This is a **brand-new, standalone project** — not tied to any other codebase.
> Create it in its own folder (e.g. `~/vincere-crm/`) and, if you want, its own git
> repo.

---

## ROLE

You are building **Vincere CRM** — a **local-first, multi-business CRM** that ingests
the owner's **daily iPhone backup** (SMS/iMessage, call log, WhatsApp) plus email,
matches every conversation to the right contact, files it under the right business,
and gives each account an **AI-generated summary, sales stage, and next action**.

There are three businesses under one roof, switchable in the header:
**Car Sales**, **Government Sales**, and **Coaching**. Shared contacts, per-business
pipelines and stages.

## NON-NEGOTIABLE PRINCIPLES

1. **Local-first / privacy.** All data (messages, calls, contacts, deals) lives in a
   local **SQLite** database on the owner's machine. Nothing is uploaded. The only
   outbound call is the on-demand AI summary, which sends **only the one thread being
   summarized** — never the whole database.
2. **The iPhone backup is read-only.** Copy/parse it; never write back to it.
3. **Daily-drop, incremental.** The owner makes a fresh encrypted backup each day and
   drops it into the app. Imports are **incremental and idempotent** — dedupe on
   stable source IDs (message GUID, call id, chat GUID) so re-dropping only appends
   what's new. Never create duplicates.
4. **Secrets & personal data never touch git.** No API keys, no backups, no exported
   messages, no `*.db` in the repo. Everything sensitive is git-ignored.

---

## TECH STACK

- **Backend:** Python **FastAPI**, bound to `127.0.0.1` only (never `0.0.0.0`).
  Serves a JSON API over SQLite.
- **Database:** **SQLite** at `data/crm.db` (git-ignored).
- **Ingestion:** Python scripts under `ingest/` that read the backup + email,
  normalize, and upsert.
- **Frontend:** Static HTML/CSS/vanilla-JS under `web/`, served by the backend. No
  build step. Clean, premium, dense CRM styling (generous whitespace, a single accent
  color per business).
- **AI:** **Claude Code CLI in headless mode**, driven by the owner's **Claude
  subscription** (see the AI section). A pluggable summarizer interface with a second
  backend for an Anthropic API key.
- **Phone normalization:** `phonenumbers` (libphonenumber) → **E.164** for reliable
  matching.

Run with `python -m vincere_crm` (or `uvicorn`) → open `http://127.0.0.1:8100`.

---

## THE DAILY WORKFLOW (design the whole app around this)

1. Each morning the owner makes an **encrypted** Finder/iTunes backup (encrypted
   because iOS only includes WhatsApp + full history in encrypted backups).
2. In the app's **Import** screen they either point at the Finder backup path or drag
   a copied backup folder in, and enter the backup password (used in-memory only,
   never stored).
3. The app runs an **incremental import**:
   - Reads `Manifest.db`, locates each source DB, (decrypts if needed).
   - Pulls only records newer than the last successful import (and dedupes on source
     IDs as a safety net).
   - Appends new messages/calls to existing threads; creates threads/contacts as
     needed; routes unknown identifiers to the **Inbox**.
   - Marks every account that received new activity as **"needs re-summary."**
4. The owner sees a **"What moved today"** digest: accounts with new messages, new
   inbox items to triage, and one-click **"Summarize updated accounts."**

Every import is recorded in `import_runs` (source, timestamps, counts) for an audit
trail and to compute "newer than last import."

---

## DATA INGESTION — iPhone BACKUP

### Locate the backup
- macOS: `~/Library/Application Support/MobileSync/Backup/<UDID>/`
- Windows: `%APPDATA%\Apple\MobileSync\Backup\<UDID>\`

Files are stored under hashed names. Use **`Manifest.db`** (SQLite mapping
`domain` + `relativePath` → `fileID`) to resolve each source DB.

- **Encrypted backups (recommended):** decrypt using the backup password — use a
  maintained library such as `iphone_backup_decrypt`, or implement the documented
  AES key-unwrap from `Manifest.plist`. Password entered per-import, never stored.
- **Unencrypted backups:** read files directly (but WhatsApp/full history may be
  missing).

| Source | Domain | Relative path |
|---|---|---|
| SMS / iMessage | `HomeDomain` | `Library/SMS/sms.db` |
| Call history | `HomeDomain` | `Library/CallHistoryDB/CallHistory.storedata` |
| Contacts | `HomeDomain` | `Library/AddressBook/AddressBook.sqlitedb` |
| WhatsApp | `AppDomainGroup-group.net.whatsapp.WhatsApp.shared` | `ChatStorage.sqlite` |

### Parsing details (implement precisely)

**SMS / iMessage (`sms.db`):**
- `message` (body=`text`, `date`, `is_from_me`, `handle_id`, `guid`, `service`),
  `handle` (`ROWID`, `id` = phone/email), `chat`, `chat_message_join`,
  `chat_handle_join`, and `attachment` + `message_attachment_join`.
- **Timestamps** = Apple absolute time, **nanoseconds** since 2001-01-01 UTC on modern
  iOS (`/1e9`, then `+978307200` for Unix epoch). Handle both ns and s forms.
- Capture group-chat participants. Dedupe key = `guid`.

**Call history (`CallHistory.storedata`, Core Data SQLite):**
- `ZCALLRECORD`: `ZADDRESS` (number), `ZDATE` (Apple epoch **seconds**),
  `ZDURATION` (s), `ZORIGINATED` (1=out, 0=in), `ZANSWERED` (0=missed). No audio —
  store who/when/duration/direction/answered only.

**Contacts (`AddressBook.sqlitedb`):**
- `ABPerson` (names, org) ⨝ `ABMultiValue` (phones/emails). Build the identity map:
  contact → {phones[], emails[]}, each normalized (phones→E.164).

**WhatsApp (`ChatStorage.sqlite`):**
- `ZWAMESSAGE` (`ZTEXT`, `ZMESSAGEDATE`, `ZISFROMME`, `ZFROMJID`/`ZTOJID`),
  `ZWACHATSESSION` (`ZCONTACTJID`, `ZPARTNERNAME`). JID `<number>@s.whatsapp.net`
  → number → normalize.

## DATA INGESTION — EMAIL

Fetch Gmail/Outlook threads and match to accounts by the contact's email. Only fetch
for addresses that belong to a tagged contact (don't vacuum the whole inbox). Store
each email as a message with `channel='email'`. Keep it optional/toggleable.

---

## DATA MODEL (SQLite)

```
contacts(id, display_name, first_name, last_name, organization, notes, created_at)
identifiers(id, contact_id→contacts, kind['phone'|'email'], value_e164_or_email, raw)  -- UNIQUE(kind, value)
contact_business(contact_id, business_id)                                              -- a contact can span businesses
businesses(id, key['car'|'gov'|'coaching'], name, accent_color)
stages(id, business_id, name, sort_order, is_won, is_lost)                             -- pipelines are DATA, editable
accounts(id, business_id→businesses, contact_id→contacts, name, owner, created_at)
deals(id, account_id→accounts, business_id, title, stage_id→stages, value, currency,
      status['open'|'won'|'lost'], opened_at, closed_at, next_action, next_action_due)
threads(id, channel['sms'|'imessage'|'whatsapp'|'email'], source_thread_id,
        contact_id, account_id, business_id, is_group, participants_json)              -- UNIQUE(channel, source_thread_id)
messages(id, thread_id→threads, source_msg_id, direction['in'|'out'], ts, body,
         channel, attachments_json)                                                    -- UNIQUE(channel, source_msg_id)
calls(id, contact_id, ts, duration_s, direction['in'|'out'], answered)                 -- UNIQUE(address, ts)
inbox(id, kind['thread'|'identifier'], ref, first_seen, sample_text, resolved)         -- untriaged
ai_summaries(id, scope['account'|'deal'], scope_id, summary, suggested_stage,
             sentiment, key_facts_json, next_best_action, risk, timeline_hash,
             backend, generated_at)                                                    -- cache by timeline_hash
import_runs(id, source, backup_udid, started_at, finished_at, counts_json, high_water) -- audit + incremental water mark
```

### Default pipelines (seed `stages`)
- **car** — `Lead → Contacted → Test Drive → Quote/Negotiation → Financing → Closed Won → Closed Lost`
- **gov** — `Prospect → Qualified → RFP/Bid → Proposal Submitted → Negotiation → Awarded → Lost`
- **coaching** — `Inquiry → Discovery Call → Proposal → Onboarding → Active Client → Renewal → Churned`

Stages are editable per business, not hardcoded.

---

## ASSIGNMENT LOGIC ("auto by contact, confirm once")

1. Each imported message/call carries a raw identifier. Normalize it and look it up
   in `identifiers`.
2. **Match → contact.** One business tag → auto-file the thread there. Multiple tags →
   keep any prior manual choice for that thread, else send to the **Inbox** to pick.
3. **No match → Inbox.** Unknown numbers/emails surface for triage: create a contact,
   tag it with a business (once), optionally spin up an account + deal. Thereafter all
   past and future messages from that identifier auto-file.
4. A per-thread **override** always beats the contact's default (someone can be both a
   coaching client and a car buyer, with threads in each business).

Triage is **deterministic** on identifiers — no AI used to route.

---

## AI SUMMARIES — powered by the owner's Claude SUBSCRIPTION (no API key)

Implement a small **`Summarizer` interface** with two interchangeable backends,
selected in config. Default = **subscription**.

### Backend A — `ClaudeCodeCLI` (default, uses the Claude subscription)
- Prereq (documented in README): install Claude Code, run `claude` once and log in
  with the Pro/Max subscription. Optionally `claude setup-token` → set
  `CLAUDE_CODE_OAUTH_TOKEN` so no browser is ever needed.
- The backend shells out headlessly and parses JSON:
  ```python
  proc = subprocess.run(
      ["claude", "-p", "--output-format", "json", PROMPT + "\n\n" + thread_text],
      capture_output=True, text=True, timeout=120,
  )
  data = json.loads(proc.stdout)     # then parse the model's JSON payload out of it
  ```
- **Caveat to note in README:** these calls share the subscription's rolling 5-hour /
  weekly usage limits with normal Claude Code use. Fine for a few summaries a day;
  batch summarization should be throttled/queued, not fired all at once.

### Backend B — `AnthropicAPI` (fallback, uses an API key)
- Uses the `anthropic` SDK with `ANTHROPIC_API_KEY` from `.env`. Same prompt/JSON
  contract. Only used if the owner sets a key and flips the config.

### Shared contract (both backends)
- Gather the account's merged, chronological timeline (messages + calls + email),
  most-recent-first, truncated to a token budget. Send **only that**.
- Instruct the model to return **strict JSON**:
  ```json
  {
    "summary": "2-4 sentence plain-English status of the relationship",
    "suggested_stage": "<one of THIS business's stage names>",
    "sentiment": "positive|neutral|at_risk",
    "key_facts": ["budget", "vehicle/service of interest", "timeline", "objections"],
    "next_best_action": "the single most useful next step",
    "risk": "what could kill the deal, or null"
  }
  ```
- Cache by `timeline_hash`; only re-summarize when new messages arrived or the owner
  clicks refresh (protects the subscription budget).
- `suggested_stage` is shown as **one-click apply** — never auto-move a deal.

---

## FRONTEND (portals)

One app, **business switcher** in the header (Car Sales / Government / Coaching),
each with its own accent color. Views:

1. **Today** — the daily digest: last import summary, accounts with new activity,
   inbox items to triage, "Summarize updated accounts."
2. **Dashboard** (per business) — open deals by stage (count + value), stale/at-risk
   accounts, missed calls.
3. **Pipeline (Kanban)** — columns = that business's stages; cards = deals (contact,
   last-touch, value); drag to change stage.
4. **Account detail** — the core screen:
   - Left: contact info, deal(s) + stage selector, next action.
   - Center: **unified chronological timeline** merging SMS/iMessage/WhatsApp/email
     bubbles + call entries (in vs out styled distinctly).
   - Right: **AI summary panel** (summary, key facts, next best action, risk;
     "Apply suggested stage", "Refresh").
5. **Inbox** — untriaged threads/identifiers; create/tag/assign in one click.
6. **Contacts** — searchable directory; edit business tags; merge duplicates.
7. **Import** — pick/drag a backup, enter password, run; live counts + `import_runs`
   history.

---

## PROJECT LAYOUT (target)

```
vincere-crm/
  vincere_crm/
    __main__.py          # launches the local server (127.0.0.1:8100)
    api/                 # FastAPI routes
    db/schema.sql        # the tables above
    db/seed.py           # businesses + default pipelines
    ingest/
      backup.py          # locate backup, read Manifest.db, decrypt
      imessage.py  calls.py  contacts.py  whatsapp.py  email.py
      normalize.py       # phone/email canonicalization, dedupe, high-water logic
    ai/
      summarizer.py      # Summarizer interface
      claude_cli.py      # Backend A (subscription)
      anthropic_api.py   # Backend B (API key)
    web/                 # frontend (index.html, styles.css, app.js)
    data/                # crm.db  — git-ignored
  tests/
    fixtures/            # a tiny synthetic sms.db so tests need no real data
  requirements.txt       # fastapi, uvicorn, phonenumbers, iphone_backup_decrypt, anthropic
  .env.example           # SUMMARIZER_BACKEND=claude_cli ; ANTHROPIC_API_KEY= (optional)
  .gitignore             # data/, .env, *.db, any exported backups
  README.md
```

---

## BUILD ORDER (phased — verify each before moving on)

1. **Scaffold + schema + seed** (businesses + pipelines) + local server serving an
   empty app shell.
2. **Backup locator + `Manifest.db` reader** — prove it finds `sms.db` in a real
   backup; wire the encrypted-backup password/decrypt path.
3. **iMessage + calls + contacts ingesters** → populate SQLite; correct timestamp
   conversion (spot-check a known message's date); dedupe verified by re-running.
4. **Incremental import + high-water mark + `import_runs`** — second daily drop only
   appends new records.
5. **Normalization + assignment** (identifiers, auto-file, Inbox).
6. **Account detail timeline** UI over real data.
7. **WhatsApp + email ingesters.**
8. **AI summaries** — `ClaudeCodeCLI` backend first (subscription), JSON contract +
   caching; then the API-key backend behind the same interface.
9. **Today digest + Dashboard + Kanban + Inbox triage** UI.
10. **README** — full setup: make an encrypted backup, install deps, log into Claude
    Code, run, drop the daily backup, triage, summarize.

Deliver working software each phase; don't stub ingestion. Use the synthetic `sms.db`
fixture for tests so no real client data is ever needed in the repo.

---

## ACCEPTANCE CRITERIA

- Drop a real (test) encrypted backup → messages, calls, contacts import with correct
  timestamps and zero duplicates. Drop tomorrow's backup → only new items append and
  affected accounts flag "needs re-summary."
- An unknown number lands in the Inbox; tagging it once files all its history to the
  chosen business and future imports auto-file it.
- Opening a car-sales account shows a merged SMS + call + email timeline and a Claude
  summary (generated **via the subscription, no API key**) with a suggested stage
  applied in one click.
- Switching the header to Government or Coaching shows only that business's accounts,
  pipeline, and stages.
- Only the single summarized thread ever leaves the machine; DB, credentials, and
  backups are all git-ignored and stay local.
