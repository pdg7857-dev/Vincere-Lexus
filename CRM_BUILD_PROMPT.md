# Master CRM — Build Prompt

> Copy everything below the line into Claude Code (or your build agent) to construct
> the app. It is written as a complete, self-contained specification. It already
> reflects the decisions made during scoping — you don't need to re-answer anything.

---

## ROLE

You are building **Vincere CRM** — a local-first, multi-business CRM that ingests a
user's iPhone backup (SMS/iMessage, call log, WhatsApp) plus their email, matches
every conversation to the right contact, files it under the right business, and
gives each account an AI-generated summary, sales stage, and next action.

Build it inside this repository. It lives alongside the existing **Vincere-Lexus**
"Lexus Trim Matcher" tool (`app/`, `scripts/`, `data/`) — reuse that app's visual
system (the **Nobel** display font + **Source Sans Pro** body font in `app/fonts/`,
white/light-grey palette, black controls, red accent, generous whitespace) so the
whole product feels like one suite. The Lexus tool becomes the "showroom" companion
launched from inside the **Car Sales** portal.

## NON-NEGOTIABLE PRINCIPLES

1. **Local-first / privacy.** All data (messages, calls, contacts, deals) lives in a
   local **SQLite** database on the user's machine. Nothing is uploaded anywhere.
   The only network call permitted is the on-demand Claude API call for summaries,
   and it sends **only the specific thread being summarized**, never the whole DB.
2. **The iPhone backup is read-only and never modified.** We copy/parse, never write
   back to it.
3. **Secrets never touch git.** The Claude API key lives in a local `.env`
   (git-ignored). No keys, no real client data, and no exported backups are ever
   committed.
4. **Idempotent imports.** Re-running an import must not create duplicates — dedupe
   on stable source IDs (message GUID, call record id, chat GUID).

---

## TECH STACK

Match the repo's existing Python + static-frontend pattern.

- **Backend:** Python **FastAPI** (or Flask if simpler), served locally on
  `127.0.0.1` only. Provides a JSON API over the SQLite DB.
- **Database:** **SQLite** file at `crm/data/crm.db` (git-ignored).
- **Ingestion:** Python scripts under `crm/ingest/` that read the iPhone backup and
  email, normalize, and upsert into SQLite.
- **Frontend:** Static HTML/CSS/JS under `crm/app/`, styled with the existing Lexus
  design system. No heavy framework required; vanilla JS + fetch is fine. Reuse the
  fonts and CSS tokens from `app/`.
- **AI:** Anthropic Claude API via the official `anthropic` Python SDK, called from
  the backend. Default model `claude-opus-4-8` (allow override via env). Key from
  `.env` (`ANTHROPIC_API_KEY`).
- **Phone normalization:** `phonenumbers` (libphonenumber) to canonicalize every
  phone identifier to **E.164** for reliable matching.

Keep it runnable with `python -m crm` (or a documented `uvicorn` command) plus a
browser at `http://127.0.0.1:8100`. No build step for the frontend.

---

## DATA INGESTION — iPhone BACKUP

The user makes a Finder/iTunes backup on their computer. **Recommend an *encrypted*
backup with a known password**: iOS only includes third-party app data (notably
**WhatsApp**) and full history in encrypted backups. Support both:

- **Unencrypted backup:** read files directly.
- **Encrypted backup:** decrypt on the fly using the backup password (use a
  maintained library such as `iphone_backup_decrypt`, or implement the documented
  AES key-unwrap from `Manifest.plist`). Prompt for the password at import time;
  never store it.

### Locating the backup
- macOS: `~/Library/Application Support/MobileSync/Backup/<UDID>/`
- Windows: `%APPDATA%\Apple\MobileSync\Backup\<UDID>\`

Backup files are stored under hashed filenames. Use **`Manifest.db`** (a SQLite file
mapping `domain` + `relativePath` → `fileID`) to locate each source DB. Key sources:

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
  `chat_handle_join`, plus `attachment` + `message_attachment_join`.
- **Timestamps** are Apple absolute time (nanoseconds since 2001-01-01 UTC on modern
  iOS; divide by 1e9, add the 978307200 epoch offset). Handle both ns and s.
- Group chats have multiple handles — capture participants.
- Store `guid` as the dedupe key.

**Call history (`CallHistory.storedata`, Core Data SQLite):**
- `ZCALLRECORD`: `ZADDRESS` (number), `ZDATE` (Apple epoch **seconds**),
  `ZDURATION` (seconds), `ZORIGINATED` (1=outgoing, 0=incoming),
  `ZANSWERED` (0=missed). No audio — record who/when/duration/direction only.

**Contacts (`AddressBook.sqlitedb`):**
- `ABPerson` (names, org) joined to `ABMultiValue` (phones, emails). Build the
  identity map: contact → {phones[], emails[]}, each normalized (phones→E.164).

**WhatsApp (`ChatStorage.sqlite`):**
- `ZWAMESSAGE` (`ZTEXT`, `ZMESSAGEDATE` Apple epoch, `ZISFROMME`,
  `ZFROMJID`/`ZTOJID`), `ZWACHATSESSION` (`ZCONTACTJID`, `ZPARTNERNAME`). JID
  `<number>@s.whatsapp.net` → extract number → normalize.

## DATA INGESTION — EMAIL

Pull Gmail/Outlook threads and match to accounts by the contact's email address.
Use the connected mail account (Gmail MCP / Google API) to fetch threads with known
client addresses. Store each email as a message with `channel='email'`. Only fetch
for addresses that belong to a tagged contact (don't vacuum the whole inbox).

---

## DATA MODEL (SQLite)

```
contacts(id, display_name, first_name, last_name, organization, notes, created_at)
identifiers(id, contact_id → contacts, kind['phone'|'email'], value_normalized, raw)   -- UNIQUE(kind, value_normalized)
contact_business(contact_id, business_id)                                              -- a contact can belong to >1 business
businesses(id, key['car'|'gov'|'coaching'], name, accent_color)
accounts(id, business_id → businesses, contact_id → contacts, name, owner, created_at)
deals(id, account_id → accounts, business_id, title, stage, value, currency,
      status['open'|'won'|'lost'], opened_at, closed_at, next_action, next_action_due)
threads(id, channel['sms'|'imessage'|'whatsapp'|'email'], source_thread_id,
        contact_id, account_id, business_id, is_group, participants_json)              -- UNIQUE(channel, source_thread_id)
messages(id, thread_id → threads, source_msg_id, direction['in'|'out'], ts, body,
         channel, attachments_json)                                                    -- UNIQUE(channel, source_msg_id)
calls(id, contact_id, ts, duration_s, direction['in'|'out'], answered)                 -- UNIQUE on (address, ts)
inbox(id, kind['thread'|'identifier'], ref_id, first_seen, sample_text, resolved)      -- untriaged items
ai_summaries(id, scope['account'|'deal'], scope_id, summary, suggested_stage,
             sentiment, key_facts_json, next_best_action, risk, model, generated_at)
import_runs(id, source, started_at, finished_at, counts_json)                          -- audit + idempotency
```

### Pipelines (stages per business — seed these)
- **car** — `Lead → Contacted → Test Drive → Quote/Negotiation → Financing → Closed Won → Closed Lost`
- **gov** — `Prospect → Qualified → RFP/Bid → Proposal Submitted → Negotiation → Awarded → Lost`
- **coaching** — `Inquiry → Discovery Call → Proposal → Onboarding → Active Client → Renewal → Churned`

Stages are data, not hardcoded — store per business so they're editable.

---

## ASSIGNMENT LOGIC ("auto by contact, confirm once")

1. On import, every message/call carries a raw identifier (phone/email). Normalize
   it and look it up in `identifiers`.
2. **Match → contact.** If the contact has exactly one business tag, auto-file the
   thread to that business. If it has several, keep the thread's business from any
   prior manual choice, else route to the **Inbox** to pick.
3. **No match → Inbox.** Unknown numbers/emails appear in an Inbox triage view where
   the user can: create a contact, tag it with a business (once), and optionally
   spin up an account + deal. After that, all past and future messages from that
   identifier auto-file.
4. A per-thread **override** always wins over the contact's default (a client who is
   both a coaching client and a car buyer can have threads in each).

No AI is used for triage — matching is deterministic on identifiers.

---

## AI SUMMARIES (Claude API, on-demand)

- Triggered when the user opens an account/deal or clicks "Refresh summary."
- Backend gathers that account's merged timeline (messages + calls + email,
  chronological), truncates to a token budget (most recent first), and sends **only
  that** to Claude.
- **Prompt Claude to return strict JSON:**
  ```json
  {
    "summary": "2-4 sentence plain-English status of the relationship",
    "suggested_stage": "<one of this business's stages>",
    "sentiment": "positive|neutral|at_risk",
    "key_facts": ["budget", "vehicle/service of interest", "timeline", "objections"],
    "next_best_action": "the single most useful next step",
    "risk": "what could kill the deal, or null"
  }
  ```
- Store the result in `ai_summaries`; show `suggested_stage` as a one-click apply
  (never auto-move a deal without the user confirming).
- Cache by timeline hash so re-opening doesn't re-bill the API; only refresh when new
  messages arrived or the user forces it.

---

## FRONTEND (portals)

One app, **business switcher** in the header (Car Sales / Government / Coaching),
styled with the Lexus design system. Views:

1. **Dashboard** — per business: open deals by stage (counts + value), recent
   activity, accounts needing attention (at-risk / stale / missed calls).
2. **Pipeline (Kanban)** — columns = that business's stages; cards = deals with
   contact, last-touch, value; drag to change stage.
3. **Account detail** — the core screen:
   - Left: contact info, the deal(s) + stage selector, next action.
   - Center: **unified chronological timeline** merging SMS/iMessage/WhatsApp/email
     bubbles and call entries (in vs out styled distinctly).
   - Right: **AI summary panel** (summary, key facts, next best action, risk,
     "Apply suggested stage", "Refresh").
4. **Inbox** — untriaged threads/identifiers; create/tag/assign in one click.
5. **Contacts** — searchable directory; edit business tags; merge duplicates.
6. **Import** — pick a backup folder (+ password if encrypted), run each ingester,
   show a live count + last-run audit from `import_runs`.

Car Sales portal shows a launcher for the existing **Lexus Trim Matcher** (`app/`).

---

## PROJECT LAYOUT (target)

```
crm/
  __main__.py            # launches local server
  api/                   # FastAPI routes
  db/schema.sql          # the tables above
  db/seed.py             # businesses + default pipelines
  ingest/
    backup.py            # locate backup, read Manifest.db, (decrypt)
    imessage.py  calls.py  contacts.py  whatsapp.py  email.py
    normalize.py         # phone/email canonicalization, dedupe
  ai/summarize.py        # Claude call + JSON contract
  app/                   # frontend (reuses ../app/fonts + design tokens)
  data/                  # crm.db, .gitignored
  .env.example           # ANTHROPIC_API_KEY=, ANTHROPIC_MODEL=claude-opus-4-8
requirements.txt         # fastapi, uvicorn, anthropic, phonenumbers, iphone_backup_decrypt
```

Update `.gitignore` for `crm/data/`, `crm/.env`, and any `*.db` / exported backups.

---

## BUILD ORDER (do these as phases, verify each)

1. **Scaffold + schema + seed** (`crm/db`, businesses + pipelines) and a local server
   that serves an empty app shell in the Lexus style.
2. **Backup locator + Manifest.db reader**; prove it finds `sms.db` on a real backup.
3. **iMessage + calls + contacts ingesters** → populate SQLite; dedupe; timestamp
   conversion correct (spot-check a known message date).
4. **Normalization + assignment** (identifiers, auto-file, Inbox).
5. **Account detail timeline** UI over real data.
6. **WhatsApp + email ingesters.**
7. **Claude summaries** with the JSON contract + caching.
8. **Dashboard + Kanban + Inbox triage** UI.
9. **Import screen** + encrypted-backup password flow.
10. **README** with setup (make a backup, install deps, add API key, run, import).

Deliver working software at each phase; don't stub the ingestion. Use a small
synthetic `sms.db` fixture for tests so no real client data is needed in the repo.

---

## ACCEPTANCE CRITERIA

- Point it at a real (test) iPhone backup → messages, calls, and contacts import
  with correct timestamps and no duplicates on re-run.
- An unknown number lands in the Inbox; tagging it once files all its history to the
  chosen business and future imports auto-file it.
- Opening a car-sales account shows a merged SMS + call + email timeline and a Claude
  summary with a suggested stage I can apply in one click.
- Switching the header to Government or Coaching shows only that business's accounts,
  pipeline, and stages.
- Nothing but the single summarized thread ever leaves the machine; the DB, keys, and
  backups are all git-ignored and stay local.
