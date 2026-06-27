# sheets-crm — formula-driven Lexus dealership CRM (Google Sheets)

A complete, **formula-first** CRM you build in Google Sheets on top of your pasted inventory exports.
It auto-matches prospects to new/used vehicles, surfaces upsell opportunities for existing customers,
and drives a one-screen daily dashboard. Everything recalculates live — no manual refresh, no
maintained output tabs.

- **[CRM-DESIGN.md](./CRM-DESIGN.md)** — the full build: tab map, every formula and the exact cell it
  goes in, the hidden helper tabs and why they exist, the editable `Config` rules, plus
  *how to use* / *how to extend* / *troubleshooting*.
- **[Snapshot.gs](./Snapshot.gs)** — the single **optional** Apps Script (daily history snapshot +
  a one-click helper-tab hider). The CRM needs none of it; install only if you want trend history.

## At a glance

| Output tab | What it gives you |
|---|---|
| `Matches` | Every prospect ↔ available vehicle match (New + Used unified), MSRP/Retail, budget fit |
| `Upsell` | Existing customers ↔ newer/higher-series upgrade vehicles |
| `Reposting` | Facebook Marketplace repost tracker: last-posted date, next-due (+10d), 1-click "add to calendar" (§14) |
| `Dashboard` | Counts, Hot-clients-with-matches, unmatched-Hot sourcing list, aging pipeline/used, reposts-due-today, mix views, upsell $ |

Built with `ARRAYFORMULA` / `QUERY` / `FILTER` / `XLOOKUP` and modern `LET` · `LAMBDA` · `REDUCE` ·
`VSTACK` / `HSTACK`. Start at **CRM-DESIGN.md §10 (How to use)**.
