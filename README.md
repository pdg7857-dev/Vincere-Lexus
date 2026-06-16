# Lexus Trim Matcher — Sales Companion

An internal tool for Lexus Canada sales executives that **cross-matches a client's
priorities against every current-lineup trim**, recommends the right package, and
surfaces upsell opportunities — plus a full "everything to know" vehicle encyclopedia
and a reverse feature finder.

Built from live **lexus.ca** data (EN, Canadian market).

## What it does

1. **Match by needs** — a questionnaire of the things clients care about (heated
   steering wheel, AWD, Mark Levinson audio, third row, panoramic roof, towing, …).
   Tap once for **must-have**, twice for **nice-to-have**.
   - Shows every trim that meets **all must-haves**, ranked by how many nice-to-haves
     it also satisfies, with starting price and lease payment.
   - **Upsell on every match (▲):** the next trim up in the same model, the price/payment
     delta, and exactly what the client *also* gains.
   - **One-feature-away (near-miss):** trims missing a single must-have, with the
     cheapest way to add it — the natural stretch-the-budget pitch.
   - **★ exclusive flags:** features only the higher trims offer, for aspirational pull.
   - Filters: body style, model, max budget, and **province** (pricing is province-specific).

2. **Browse vehicles** — pick a model and powertrain variant to get the complete
   grouped spec sheet across all its trims (every feature, with values), key specs
   (power, drivetrain, seats, range, towing, cargo) and the price ladder. Use this as
   the guide when a client wants to know everything about a vehicle.

3. **Feature finder** — client wants one specific thing? Search it and see every model
   and trim that delivers it, plus the **cheapest way in** ("available from $X on …").

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
