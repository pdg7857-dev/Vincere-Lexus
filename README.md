# Lexus Trim Matcher — Sales Companion

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
   - **Match in-stock vehicles:** toggle from "Trims to order" to "In stock" to score the
     client's needs against the **actual Northwest Lexus inventory**, filterable by
     **New / Demo / Used**. Pre-owned and demo units inherit the current model-year trim
     spec as a feature guide (flagged "features approx."), and show real price/odometer
     ranges, condition badges and finance on the actual vehicle price.
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
   The committed snapshot is the **full, real Northwest Lexus inventory** (≈193 units —
   new, demo, certified pre-owned and used, incl. trade-ins), pulled from
   northwestlexus.com. To refresh:

   ```
   # If the dealer site is reachable from your network (it sits behind a Cloudflare WAF
   # that blocks some datacentre IPs):
   python3 scripts/scrape_inventory.py                 # live scrape via JSON-LD

   # Or normalize pre-extracted listing JSON (e.g. exported from the listing pages):
   python3 scripts/scrape_inventory.py --ingest data/inventory_source

   # Or regenerate a labelled demo sample:
   python3 scripts/scrape_inventory.py --sample
   ```

## Knowledge quiz (`app/quiz.html`)

A self-contained study quiz for learning the **general** differences across the
2026 lineup — built straight from the same lexus.ca data baked into this repo.
It targets the things a sales exec actually needs to explain, not per-trim spec
memorization:

- **What the powertrain suffixes mean** — `(no letter)` = gas, `h` = self-charging
  hybrid, `h+` = plug-in hybrid, `e` = fully electric (the RZ).
- **What the numbers signify** (e.g. decoding `RX 350h+`) — historically engine
  displacement, now a performance/output tier on turbo + electrified models.
- **Model vs model** — size/segment ladder (UX → NX → RX → TX → GX → LX), sedans
  (ES/IS/LS), coupe (LC), and which are body-on-frame vs car-based.
- **Trim families** — F SPORT (sporty look/handling) vs full "F", F SPORT Design
  vs F SPORT Performance, Luxury / Executive / Ultra Luxury, Overtrail off-road.

It also includes **customer-scenario questions** — "a client wants a comfort RX
but insists on a panoramic moonroof; what's the most affordable trim?" — whose
answers are computed straight from the real price-ordered trim/feature matrix in
`data/lexus.json`, so the "cheapest way in" to each feature is accurate.

**Pick your focus before you start:** a menu lets you scope the quiz to the
**whole lineup**, **SUVs** (UX · NX · RX · TX · GX · LX · RZ), **Sedans**
(ES · IS · LS), or **Coupe & Convertible** (LC). The naming/powertrain
fundamentals are tagged `all` and always included in every scope; only the
model-specific questions are filtered. You can also choose a length (Full / 50 / 20).

128 multiple-choice questions, each with an explanation. **Every run reshuffles
the question order *and* each question's answer options** (Fisher–Yates), so no
two quizzes are alike. One question at a time with instant feedback, a live score,
and a per-topic breakdown at the end. Open it like the main app:

```
open app/quiz.html
# or via CDN: https://raw.githack.com/pdg7857-dev/vincere-lexus/<commit-sha>/app/quiz.html
```

Questions live in `app/quiz-data.js`. Each carries a `cat` (topic), a `seg`
(`suv` / `sedan` / `coupe` / `all`) used by the focus filter, and the correct
answer stored separately from the distractors so it's never "always A".

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
