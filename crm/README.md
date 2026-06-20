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

Phases 2 (email + Claude intake) and 3 (vehicle matching) are scaffolded but not built.

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
| `npm run backup` | **Encrypted** DB dump → `backups/` |

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

Remote access (from your phone, etc.) should go through **Tailscale** — never by
exposing the port. The app binds to `localhost` by design.

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
