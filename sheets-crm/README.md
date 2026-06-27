# sheets-crm — formula-driven Lexus dealership CRM (Google Sheets)

A complete, **formula-first** CRM you build in Google Sheets on top of your pasted inventory exports.
It auto-matches prospects to new/used vehicles, surfaces upsell opportunities for existing customers,
and drives a one-screen daily dashboard. Everything recalculates live — no manual refresh, no
maintained output tabs.

- **[BuildCRM.gs](./BuildCRM.gs)** — ⭐ **fastest start.** One Apps Script that builds the *entire*
  workbook for you: every tab, header, formula, named range, formatting, and demo rows. Paste it once
  and run `buildCRM`. (A `.xlsx`/`.csv` import can't carry `QUERY`/`ARRAYFORMULA`/`LAMBDA`/named ranges
  into Sheets — a script can, which is why this is the "drop-in" file.)
- **[CRM-DESIGN.md](./CRM-DESIGN.md)** — the full reference: tab map, every formula and the exact cell it
  goes in, the hidden helper tabs and why they exist, the editable `Config` rules, plus
  *how to use* / *how to extend* / *troubleshooting*. Read this if you'd rather build by hand or want to
  understand/extend what `BuildCRM.gs` generates.
- **[Snapshot.gs](./Snapshot.gs)** — **optional** add-ons (daily history snapshot, helper-tab hider,
  hands-free Google Calendar repost reminders). The CRM needs none of it.

## Fastest setup (2 minutes)

1. Create a blank sheet → [sheets.new](https://sheets.new).
2. **Extensions → Apps Script**, delete the stub, paste all of **`BuildCRM.gs`**, **Save**.
3. Run `buildCRM`, approve the permission prompt.
4. Reload the sheet → open the **Dashboard** tab. Done. (Demo rows are included; clear them and paste
   your real exports into `Inventory`/`Pipeline`/`Delivery`/`Used`. Set `INCLUDE_SAMPLE = false` in the
   script to skip demo rows.)

## At a glance

| Output tab | What it gives you |
|---|---|
| `Matches` | Every prospect ↔ available vehicle match (New + Used unified), MSRP/Retail, budget fit |
| `Upsell` | Existing customers ↔ newer/higher-series upgrade vehicles |
| `Reposting` | Facebook Marketplace repost tracker: last-posted date, next-due (+10d), 1-click "add to calendar" (§14) |
| `Dashboard` | Counts, Hot-clients-with-matches, unmatched-Hot sourcing list, aging pipeline/used, reposts-due-today, mix views, upsell $ |

Built with `ARRAYFORMULA` / `QUERY` / `FILTER` / `XLOOKUP` and modern `LET` · `LAMBDA` · `REDUCE` ·
`VSTACK` / `HSTACK`. Start at **CRM-DESIGN.md §10 (How to use)**.
