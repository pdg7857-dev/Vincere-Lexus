# Vincere-Lexus — Sales workspace

A private, **single-user** workspace for a Lexus sales executive. Two tools share one repo:

- **[`crm/`](crm/)** — **Personal Sales CRM** (Next.js + Prisma + PostgreSQL).
  Customers, standing "wants", inventory, a configurable sales pipeline, email intake,
  and Want↔Vehicle matching. Runs **locally** on `localhost`, private by design.
  See [`crm/README.md`](crm/README.md) for setup, backups, and the Mac-mini move.
- **[`showroom/`](showroom/)** — the original **Lexus Trim Matcher** static app
  (no build step): match a client's priorities against the full lineup and live dealer
  stock, then export a client-facing PDF. See [`showroom/README.md`](showroom/README.md).

## Shared assets

- **`data/`** — normalized Lexus dataset (`lexus.json`) + dealer inventory snapshot
  (`inventory.json`). Used by the showroom tool **and** imported into the CRM database.
- **`scripts/`** — Python scrapers that (re)build the datasets in `data/` and `showroom/`.

## Quick start

```bash
# ── CRM (the main app) ──
cd crm
cp .env.example .env          # then edit secrets (DB password, session secret, etc.)
docker compose up -d          # start local PostgreSQL
npm install
npm run db:setup              # run migrations + seed (stages, lead sources, your login)
npm run dev                   # → http://localhost:3000

# ── Showroom matcher (static, no build) ──
open showroom/index.html
```

Everything runs **locally**. Nothing is exposed to the public internet — remote access
later will go through Tailscale (see `crm/README.md`). Enable **full-disk encryption
(BitLocker)** on this laptop: without it, a lost laptop = the whole customer list exposed.
