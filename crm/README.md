# Vincere Lexus — Sales CRM

A single-salesperson sales CRM for the dealership, built to the **Car Sales CRM**
design handoff and driven by the **real** data exported from the
`VincereLexus_CRM` workbook.

It tracks opportunities through a drag-and-drop pipeline, holds the full
opportunity record, runs the day from an appointment calendar and task list,
manages used / new / incoming inventory, matches customers to stock with a
weighted requirements questionnaire, and tracks Facebook Marketplace ads.

Primary user: the salesperson (single user, no roles). **Works on desktop and
phone** — the layout switches to a mobile app (slide-in nav, swipeable pipeline,
stacked records, full-screen message threads) below ~820px. Add it to the iPhone
home screen for a one-tap app.

## Run it

Static site — no build step, no server. Just open it:

```
open crm/index.html
```

Or serve it (recommended for tablets / the showroom Wi-Fi):

```
python3 -m http.server 8100 --directory crm
# visit http://localhost:8100
```

Everything is baked into `crm/data.js`, so it also works straight off a CDN,
e.g. `https://raw.githack.com/pdg7857-dev/vincere-lexus/<sha>/crm/index.html`.

## Screens

1. **Pipeline** — horizontal kanban across the 7 stages (New lead → Contacted →
   Appointment → Test drive → Negotiation → Financing → BM–Delivered). Drag a
   card to change stage; click to open the opportunity. Per-column value / gross
   totals, hot flags, stock / source / pay chips.
2. **Opportunity** — the full record: header value + est. gross, clickable stage
   chips, a 9-cell fact grid, an activity log you can append to, the vehicle of
   interest, trade-in, and *"other cars they may like"* (click to swap the deal's
   vehicle).
3. **Today** — a day timeline of appointments plus three task columns (Due today
   / Next 2 days / Going cold) with urgency bars and check-off.
4. **Calendar** — a week grid (Wed–Mon) with typed appointment blocks and a day
   panel to toggle Google Calendar sync and cycle the email-reminder lead time.
5. **Customers** — the whole book in one sortable, searchable table.
6. **Matchmaker** — pick a repeat buyer to preload their requirements, then tune
   body / colour / interior / trim / mileage / price and mark each criterion
   Ignore → Prefer → Must-have. Scores every unit (incoming included) into
   *perfect matches* and *worth showing anyway*.
7. **Inventory** — All / Used / New / Incoming with a simulated feed-import
   review step; leads-per-unit and who's interested. **Click any row** for a
   full detail drawer showing every field pulled from the sheet (VIN, trim,
   colour/interior, asking + AT value, days in stock; for incoming units the
   order status, ETA window and who it's allocated to) plus the matched
   customers. A **Filters** panel adds hyper-precise filtering: free-text
   (stock / VIN / colour / trim), make, fuel, price / km / year ranges, max
   days-in-stock, *has a lead*, and *matched to a customer*.
8. **Marketplace ads** — KPIs, paste-a-link importer (matched to stock by VIN),
   the ad tracker with CRM price-drift flags, and an *in stock with no ad* list.
9. **Reports** — five KPIs, a stage funnel, and a lead-source breakdown.
10. **New lead** — capture a customer, decode a VIN against inventory, and save
    into the pipeline.
11. **Import leads** — a spreadsheet-style grid: type a row per customer (or
    paste rows straight from Excel/Sheets — Tab or comma separated) and hit
    *Import*. Each row becomes a New-lead opportunity with its vehicle of
    interest auto-matched from make / body / budget.
12. **Messages** — a conversation inbox plus an iMessage-style thread per client,
    with **tap-to-Call / Text / Email** (native `tel:` / `sms:` / `mailto:`
    deep links that launch the iPhone's own apps). Threads are the client's real
    iMessage/SMS history once you import a backup (see below), or clearly-labelled
    sample threads until then. The same thread + quick-actions appear on each
    Opportunity.

## Contacts & iMessage threads from your iPhone

A web app can't read an iPhone's Messages or Contacts directly — iOS sandboxes
them away from every browser and third-party app. The supported path is a local
**Finder / iTunes backup**, which a companion script reads and links to clients:

```
# 1. On the Mac: Finder → your iPhone → "Back up all the data to this Mac"
#    (leave "Encrypt local backup" off for the simplest path), Back Up Now.
# 2. Point the importer at that backup:
python3 scripts/import_iphone_backup.py            # newest backup, auto-detected
python3 scripts/import_iphone_backup.py /path/to/Backup/<UDID>
#    encrypted backup:  add  --password 'YOUR_BACKUP_PASSWORD'
# -> writes crm/messages.js (real threads, matched to clients by phone number)
```

The CRM loads `crm/messages.js` if present and shows each client's real
conversation; re-run after each backup to refresh. Without it, the Messages view
falls back to the sample threads seeded in `data.js`. Matching is on the last 10
digits of the phone number, so a client's CRM phone must match their number in
Messages.

The top-bar search / lead-source / **Hot only** filters apply to Pipeline and
Customers.

## The data

`crm/data.js` is generated from the workbook by `scripts/build_crm_data.py`:

| CRM model        | Source sheet(s)                                             |
|------------------|------------------------------------------------------------|
| **deals**        | `Clients` — the live opportunities (10)                     |
| **inventory**    | `Used` (pre-owned) + `Inventory` (new/demo) + `Pipeline` (incoming) |
| **repeat buyers**| the Purchased/Repeat client + `Leads - With Vehicle` (upsell targets) |
| **ads**          | `FB_Log` (+ seeded ads for aged used stock)                |
| **matches**      | `_UsedMatches` — the workbook's own customer↔vehicle matches (72) |
| **conversations**| sample threads seeded from client notes (replaced by an iPhone-backup import) |
| new-vehicle price| joined to the `Pricing` (MSRP) sheet by series + trim      |

Each inventory record also carries a `detail` object with the raw sheet fields
surfaced in the drawer (in-stock date, condition, keys, recon, Carfax for used;
order type / status, package suffix, ETA window, allocation for new & incoming).
Each deal carries `matchedStocks` (the stock #s the salesperson shortlisted), and
a vehicle's *matched customers* combine that, the vehicle-of-interest link, and
the `_UsedMatches` auto-matches.

Mapping notes:

- **Stage** comes from each client's *Level* (Cold → New lead, Warm → Contacted,
  Hot → Appointment, Smoking → Negotiation, Purchased → Delivered), with a couple
  of per-client overrides so the funnel reflects where each deal actually sits.
- **Vehicle of interest** is resolved from the stock #s / VINs a client's
  *Matched Vehicle(s)* note (or their notes) reference; otherwise the inventory is
  scored against their make / trim / dream-car keywords and budget.
- **Body style** is derived from the model (Lexus series prefix, common
  makes/models); **fuel** from `h` / `+` / `RZ` markers.
- **AutoTrader value** is estimated (≈95% of ask for used, MSRP for new) — there's
  no AT feed in the export; wire the real one in when available.

Things the export has **no source for** are generated so the views are alive, and
flagged as such in the build script:

- **Appointments** — a realistic Wed–Mon week is generated from the active
  opportunities (there is no appointment feed).
- **Ad engagement** (views / saves / messages) — seeded deterministically from
  each unit's days-in-stock. Marketplace has no public listing API; the design's
  paste-a-URL importer is the intended real path.

### Regenerate the data

The raw workbook is **git-ignored** — it carries hundreds of extra client/sales
records (far more PII than the app needs), so only the trimmed `data.js` is
committed. To rebuild after a fresh export:

```
python3 scripts/build_crm_data.py path/to/Copy_of_VincereLexus_CRM.xlsx
# -> writes crm/data.js
```

## Integrations (still simulated — as in the design)

Google Calendar two-way sync, email reminders, inventory feed import
(DealerTrack / vAuto / factory sheet / CSV), VIN decode fallback (NHTSA vPIC),
AutoTrader appraisals, and Facebook Marketplace import are represented in the UI
but not yet wired to live services. See the design handoff for the intended
implementation of each.

## Tech

Vanilla HTML / CSS / JS — one `app.js`, no framework, no build. State lives in a
single object; every view is derived on render. Dark oklch theme, JetBrains Mono
for all numbers / VINs / dates, recreated from the design's tokens.
