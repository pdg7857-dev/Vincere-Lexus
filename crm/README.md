# Vincere CRM

A private, single-user sales CRM (Next.js + Prisma + PostgreSQL). Runs **locally**
on `localhost` — never exposed to the public internet.

> Part of the [`Vincere-Lexus`](../README.md) monorepo. Shares the Lexus dataset and
> dealer inventory in [`../data`](../data) with the `showroom` trim-matcher.

## Requirements

- **Node.js 20.9+** (Next.js 16 minimum)
- **Docker** + Docker Compose (for PostgreSQL)
- **gpg** (for encrypted backups)

## First-time setup

```bash
cd crm
cp .env.example .env          # then edit secrets (DB password, SESSION_SECRET, ADMIN_*)
docker compose up -d          # start local Postgres (binds 127.0.0.1 only)
npm install
npm run db:setup              # apply migrations + seed (stages, lead sources, your login)
npm run dev                   # → http://localhost:3000
```

Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`, then change the
password in **Settings → Security** (and optionally turn on 2FA).

Optional — bulk-load the bundled dealer inventory into the CRM:

```bash
npm run import:inventory      # imports ../data/inventory.json (upserts by VIN)
```

## What's here (Phase 1)

- **Auth** — single login (bcrypt) + secure session cookie, optional **TOTP 2FA**.
- **Customers** — searchable list, full profile, web-form intake with **email/phone
  dedupe**, soft-delete (archive), and **PIPEDA** tools (consent toggle, JSON export,
  hard-delete erasure).
- **Wants** — standing orders per customer.
- **Inventory** — list, add/edit, **CSV import**.
- **Pipeline** — Kanban board across **editable** stages; deals carry a stage-change
  audit trail (OMVIC-style records).
- **Settings** — edit pipeline stages & lead sources, security, backup info.
- **Compliance surfacing** — export-restriction flag for exporters/new vehicles, and
  AML reminders on CASH/WIRE customers.

**Phase 2 (built):** email intake (forwarded address + IMAP polling), the intake
pipeline (match → attach or create), AI signature parsing & note summaries
(Anthropic), an **Intake-review queue**, and the **Claude bridge** — a local MCP
server so you can text updates to Claude and have it file them into the CRM.

**Phase 3 (built):** the matching engine (hard filters + soft scoring), the
**Match inbox**, dashboard + nav alerts, and a daily digest in the worker.
Matches recompute when a vehicle or want changes, plus a scheduled re-scan.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) at http://localhost:3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:migrate` | Create + apply a migration (dev) |
| `npm run db:deploy` | Apply committed migrations (prod / new machine) |
| `npm run db:seed` | Seed stages, lead sources, login |
| `npm run db:studio` | Prisma Studio (DB browser) |
| `npm run import:inventory` | Load `../data/inventory.json` into Vehicle |
| `npm run sync:inventory` | Scrape Northwest Lexus → import + match (`-- --no-scrape` to skip the web) |
| `npm run feed` | Import any inventory CSVs dropped in `inventory-feed/` (one-shot) |
| `npm run backup` | **Encrypted** DB dump → `backups/` |
| `npm run worker` | Background IMAP poll + match re-scan + **inventory feed** |
| `npm run mcp` | Local MCP server for the Claude text-update bridge |
| `npm run go-remote` | Set up phone access: detect tailnet name → `.env` + Tailscale Serve |

## Email & Claude intake (Phase 2)

All intake runs through one pipeline: match the sender → attach the message as an
activity (with an AI summary), or create a new lead with AI signature autofill
(flagged *unverified*). New / AI-touched records land in **Intake review** for you
to confirm. Intake is read/record only — nothing is ever auto-replied.

**AI bits** (set in `.env`):

- `ANTHROPIC_API_KEY` — signature parsing + summaries. Without it, intake still
  works, just without AI enrichment.
- `ANTHROPIC_MODEL` — defaults to `claude-sonnet-4-6`.
- `INTAKE_API_TOKEN` — bearer token guarding the local intake API.

**Email (IMAP)** — set `IMAP_HOST` / `IMAP_PORT` / `IMAP_USER` / `IMAP_PASSWORD`
(an app password is fine), then run the poller (or use **Settings → Poll inbox now**):

```bash
npm run worker        # polls the inbox on POLL_CRON (default every 5 min)
```

Forward mail to that inbox — or a dedicated `crm-intake@` address that lands there —
to capture it.

**Claude bridge (text updates)** — run the bundled MCP server and add it to Claude
Desktop, then tell Claude things like *“log a call with Mr. Tan — wants a white
RX 350 under $80k”*:

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "vincere-crm": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/crm/mcp/server.ts"],
      "env": { "INTAKE_API_TOKEN": "<from .env>", "CRM_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

The CRM must be running (`npm run dev`) for the bridge to write. Everything stays on
localhost.

## Auto inventory feed

Instead of importing inventory by hand each time, drop CSV exports into a watched
folder and they import themselves (same column mapping as the manual import):

```bash
# create the folder (or click Settings → "Run import now" once)
mkdir inventory-feed
cp ~/Downloads/lexus-stock-2026-06-22.csv inventory-feed/
npm run worker        # picks up new CSVs on FEED_CRON (default every 10 min)
# or run it once, on demand:
npm run feed
```

- New stock is **created**, existing stock is **updated** (matched by VIN), and
  every import **recomputes matches** so fresh arrivals show up in the Match inbox.
- Processed files are archived to `inventory-feed/processed/`; unparseable files go
  to `inventory-feed/failed/`. Each run is logged under **Settings → Inventory feed**.
- Files modified in the last few seconds are skipped (so half-copied files aren't
  imported). Point `INVENTORY_FEED_DIR` at any folder — e.g. where your DMS writes
  its nightly export — to wire up a real feed.

The feed folder holds dealer/customer data, so it's **gitignored** and never committed.

## Dealer inventory sync (Northwest Lexus)

Pull live **new + pre-owned** stock straight from northwestlexus.com — at the click of
a button (**Settings → Dealer inventory → "Sync from Northwest Lexus"**), or on a
schedule. It runs the bundled scraper (`scripts/scrape_inventory.py`, which reads the
dealer's sitemap + per-vehicle JSON-LD), then imports the result and recomputes matches.

```bash
npm run sync:inventory              # scrape the web, then import + match
npm run sync:inventory -- --no-scrape   # just re-import the snapshot already on disk
```

Schedule it in the worker with `DEALER_SYNC_CRON` (e.g. `0 7 * * *`; empty = off), or
from an OS cron calling `npm run sync:inventory`.

> ⚠️ **Two requirements:** the dealer site is behind **Cloudflare**, so the scrape only
> works from your **home network** (a datacentre/VPN IP gets a 403), and you need
> **`python3`** installed. A blocked or empty scrape **leaves your current snapshot
> untouched** (it's backed up and restored automatically) — so it's safe to click.

The snapshot is point-in-time; re-run to refresh. Imports are idempotent (upsert by VIN).

## Backups & restore

```bash
npm run backup     # prompts for a passphrase; writes backups/crm-<ts>.sql.gpg
```

Restore into a running, empty database:

```bash
gpg -d backups/crm-YYYYMMDD-HHMMSS.sql.gpg \
  | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

> 🔒 **Enable BitLocker** (full-disk encryption) on this laptop. The DB password and
> session secret live in `.env`, and the database holds your entire customer list —
> without full-disk encryption, a lost/stolen laptop exposes all of it. (Encrypted
> backups protect the dumps; BitLocker protects the live database + `.env`.)

## Moving to the Mac mini later

1. Install Node + Docker on the Mac.
2. Copy the repo (or `git clone`). **Do not** copy `node_modules` or the Docker volume.
3. `cd crm && cp .env.example .env` and set the same secrets.
4. `docker compose up -d && npm install && npm run db:deploy`
5. Restore your latest encrypted backup (above).
6. `npm run dev`.

Remote access (from your phone, etc.) goes through **Tailscale** — never by exposing
the port. See below.

## Remote access from your phone (Tailscale)

Use the CRM from your phone while it stays **private** — no public internet exposure.
Tailscale puts your phone and this machine on one small encrypted network (your
"tailnet"); **Tailscale Serve** then shares the local app over that network with real
HTTPS, so the app keeps binding to `localhost` and nothing is opened to the world.

**Easiest:** once Tailscale is installed + signed in on both devices, run this on the
machine that hosts the CRM — it auto-detects your tailnet name, writes it into `.env`,
and starts Tailscale Serve:

```bash
npm run go-remote     # does steps 2–3 below for you
npm run dev           # restart so REMOTE_HOSTNAMES takes effect
```

Then open `https://<your-machine>.ts.net` on your phone. The manual equivalent:

1. **Install Tailscale** on this machine *and* your phone; sign both into the same
   account. On the machine: `tailscale up` (note its MagicDNS name, e.g.
   `macmini.tailXXXX.ts.net`).
2. **Share the app over the tailnet** (HTTPS, localhost-only origin):
   ```bash
   tailscale serve 3000        # proxies https://<your-machine>.ts.net → localhost:3000
   ```
3. **Tell the CRM its remote hostname** so logins/forms work. In `.env`:
   ```bash
   REMOTE_HOSTNAMES="macmini.tailXXXX.ts.net"
   ```
   then restart the app. (Next.js rejects cross-origin Server Action posts by default —
   this allowlists your tailnet name for `allowedDevOrigins` + `serverActions.allowedOrigins`,
   otherwise even **login** would fail from the phone.)
4. On your phone (with Tailscale on), open **`https://macmini.tailXXXX.ts.net`**.

Notes:
- **Stays local.** Traffic only flows between your devices over the encrypted tailnet;
  the app is never bound to `0.0.0.0` or the public internet.
- **HTTPS matters for the cookie.** Tailscale Serve gives you a valid HTTPS cert, so the
  session cookie works in production mode (`npm start`). Prefer Serve over hitting the
  raw `100.x.y.z:3000` address.
- Lock down further with tailnet ACLs if you ever add devices.

## Privacy note (AI)

In **Phase 2**, incoming email bodies and notes are sent to the **Anthropic API** for
signature parsing and summarization — that means PII leaves your machine in transit
for those features. Nothing is sent to any third party in Phase 1.

## Tech notes

- **Next.js 16** (App Router, Turbopack, async request APIs, `proxy.ts` auth guard).
- **Prisma 6** on PostgreSQL (native enums + arrays). Soft-delete via `archivedAt`.
- Passwords hashed with **bcryptjs** (pure-JS → moves across OSes with no rebuild).
- The DB is the source of truth; the app folder is disposable (rebuild with
  `npm install`). Portability = repo + an encrypted dump.
