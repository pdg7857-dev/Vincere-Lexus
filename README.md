# Lexus Trim Matcher — Sales Companion

> **Two tools in this repo:**
> 1. **Lexus Trim Matcher** (`app/`) — the Lexus-only sales companion documented below.
> 2. **2026 Luxury Cross-Reference** (`compare/`) — a cross-brand decision tool that ranks
>    every 2026 **Lexus · BMW · Mercedes-Benz · Audi** trim (Canada, **250 trims**) by
>    reliability, running cost, value, luxury, efficiency and performance, with a default
>    **reliability/running-cost lean that favours Lexus** and live, user-adjustable weights.
>    See [`compare/README.md`](compare/README.md).

An internal tool for Lexus Canada sales executives that **cross-matches a client's
priorities against every current-lineup trim**, recommends the right package, and
surfaces upsell opportunities — plus a full "everything to know" vehicle encyclopedia
and a reverse feature finder.

Built from live **lexus.ca** data (EN, Canadian market). Every result and vehicle
shows the actual lexus.ca hero photo, and any view can be exported to a clean,
client-facing PDF.

The interface mirrors the **lexus.ca visual system** — the brand **Nobel** display
typeface and **Source Sans Pro** body font (bundled in `app/fonts/`), Lexus's
white/light-grey palette, black controls, red accent, and generous whitespace.

## Open it on a phone / tablet

The app is hosted straight from this repo via a CDN — open the link in
**“Provide a link”** in the latest message, or build your own from any commit:

```
https://raw.githack.com/pdg7857-dev/vincere-lexus/<commit-sha>/app/index.html
```

(Add to your home screen for a one-tap showroom app.)

## What it does

1. **Match by needs** — a questionnaire of the things clients care about (heated
   steering wheel, AWD, Mark Levinson audio, third row, panoramic roof, towing, …).
   Tap once for **must-have**, twice for **nice-to-have**.
   - Shows every trim that meets **all must-haves**, ranked by how many nice-to-haves
     it also satisfies, with starting price plus **lease and finance** payments.
   - **Partial-match tiers:** when the client picks too many wants for any one trim,
     it still surfaces the closest options bucketed into **90%+ / 80–89% / 70–79%**
     matches, each with a match-percentage badge (e.g. "86% match · 6/7").
   - **Lease vs finance:** lease is the exact advertised offer; finance is estimated
     live from an editable APR/term you set to today's Lexus Financial Services rate
     (lease is shown first — we prefer lease).
   - **Upsell on every match (▲):** the next trim up in the same model, the price/payment
     delta, and exactly what the client *also* gains.
   - **One-feature-away (near-miss):** trims missing a single must-have, with the
     cheapest way to add it — the natural stretch-the-budget pitch.
   - **★ exclusive flags:** features only the higher trims offer, for aspirational pull.
   - Filters: body style, model, max budget, and **province** (pricing is province-specific).
   - **📄 Client summary:** export the recommendations to a branded, client-facing PDF
     (their name + your name, photos, prices, matched features, upgrade suggestions).
   - 56 curated "wants" spanning comfort, seating, tech, audio, exterior, performance,
     capability and safety.

2. **Browse vehicles** — pick a model and powertrain variant to get the complete
   grouped spec sheet across all its trims (every feature, with values), key specs
   (power, drivetrain, seats, range, towing, cargo) and the price ladder. Use this as
   the guide when a client wants to know everything about a vehicle.
   **📄 Print spec sheet** exports the full trim-by-trim comparison.

   Each variant also shows the applicable **warranty coverage** (comprehensive,
   powertrain, corrosion, roadside, plus hybrid/EV battery terms by powertrain).

3. **Feature finder** — **select multiple features at once** and find every model and
   trim that delivers them (toggle **match ALL** vs **match ANY**), with the **cheapest
   way in** for each model ("available from $X on …").

4. **Cart + live stock check** — add one or more trims to a cart (persists across
   reloads), then cross-reference them against a **Northwest Lexus inventory snapshot**.
   Each item checks **new and pre-owned** stock: the **exact trim in stock** (colour,
   stock #, VIN, price, status, link), any **Certified Pre-Owned / Used unit of the same
   trim** (with year + odometer + price — the cheaper alternative), and the **other
   units of that model** available (new and pre-owned counts). Units are badged
   **NEW / DEMO / CPO / USED** with stock #, VIN and a link to the live listing. Export
   a **printable quote** of the selected vehicles with their availability.

   Dealer stock lives in `data/inventory.json`, built by `scripts/scrape_inventory.py`.
   The committed snapshot is **real, live Northwest Lexus inventory** (≈48 units across
   new / demo / certified pre-owned / used), pulled from northwestlexus.com. To refresh:

   ```
   # If the dealer site is reachable from your network (it sits behind a Cloudflare WAF
   # that blocks some datacentre IPs):
   python3 scripts/scrape_inventory.py                 # live scrape via JSON-LD

   # Or normalize pre-extracted listing JSON (e.g. exported from the listing pages):
   python3 scripts/scrape_inventory.py --ingest data/inventory_source

   # Or regenerate a labelled demo sample:
   python3 scripts/scrape_inventory.py --sample
   ```

## Run it

The app is a static site with the dataset baked into `app/data.js`, so it works by
just opening the file — no build step, no server required:

```
open app/index.html          # or double-click it
```

Or serve it (recommended for tablets / sharing on the showroom Wi-Fi):

```
python3 -m http.server 8099 --directory app
# visit http://localhost:8099
```

## Refreshing the data (new model year / price changes)

```
python3 scripts/scrape.py          # pull raw spec + pricing JSON -> data/raw/
python3 scripts/build_dataset.py   # normalize -> data/lexus.json + app/data.js
```

## How the data is built

Everything comes from two clean JSON sources on lexus.ca (no fragile HTML scraping):

- **Specifications model JSON** (`…/vehicle_specificatio.model.json`) — per model:
  trims (packages), powertrain variants, and the full feature-availability matrix
  grouped into Exterior / Interior / Infotainment / Safety / Powertrain / Dimensions.
- **Build & Price pricing API** (`/bin/api/price_calculation/lexus/prices.json?series=…`) —
  per-province starting price per trim, the package price delta, and lease terms.

They join cleanly on `modelId` + `packageCode`.

### Matching nuances handled in `build_dataset.py`

- **`Remove:` rows are negations.** Some packages *delete* a base feature; those rows
  never count as "has it."
- **Ventilated implies heated.** Lexus lists "Heated Front Seats" only on the trims
  where it's the headline; top trims show "Ventilated Front Seats" (which are always
  also heated). The "heated seats" need matches both, so top trims aren't wrongly excluded.
- **Customer "wants"** (the questionnaire) are a curated layer mapped to the underlying
  spec rows, so the UI always shows *which* real feature satisfied each need.
- **Derived attributes** (AWD, seats, towing, latest Lexus Safety System+) come from the
  spec/dimension data, not guesswork.

## Pricing note

Starting prices are the figures shown on the lexus.ca Build & Price configurator and
**include freight/PDI**. Trim-to-trim package deltas are exact. Always confirm final
pricing before quoting a client.

## Project layout

```
scripts/scrape.py          # fetch raw spec + pricing JSON -> data/raw/
scripts/build_dataset.py   # normalize + join -> data/lexus.json, app/data.js
data/raw/                  # raw API responses (regenerable)
data/lexus.json            # canonical normalized dataset
app/                       # the tool (index.html, styles.css, app.js, data.js)
```

## Current lineup covered

14 models · 23 powertrain variants · 86 trims (2026 model year, Canadian market):
ES, IS, LS, LC, LC Convertible, NX, NX Plug-in, RX, RX Plug-in, RZ, GX, LX, TX, UX.
