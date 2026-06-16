# 2026 Luxury Cross-Reference — Lexus · BMW · Mercedes-Benz · Audi

A decision tool that puts every **2026 Lexus, BMW, Mercedes-Benz and Audi** trim
(Canadian market) side by side, scored on the things that actually drive an
ownership decision — with a deliberate **reliability / running-cost lean that
favours Lexus**.

It's a sibling to the Lexus-only sales matcher in [`../app`](../app); this tool is
the cross-brand "which should I actually buy" layer.

## Open it

Static site, no build step — just open `index.html`, or serve it:

```
python3 -m http.server 8099 --directory compare
# visit http://localhost:8099
```

Hosted from the repo via CDN:

```
https://raw.githack.com/pdg7857-dev/vincere-lexus/<commit-sha>/compare/index.html
```

## What it does

1. **Priority weights (the bias is a feature).** Six sliders — Reliability, Low
   running cost, Value, Luxury/tech, Efficiency, Performance — combine each trim's
   0–100 dimension scores into an **overall match**. The default
   **"Reliability-first (Lexus lean)"** preset weights reliability + running cost
   highest, so Lexus rises to the top *because* of its dependability and low upkeep,
   not by fiat. Switch to **Performance-first** and the German cars take over —
   the tradeoff is explicit and yours to set. Other presets: **Balanced**,
   **Lowest running cost**.

2. **Filter & rank.** By brand, body style, powertrain (gas / hybrid / PHEV / EV),
   max price, min seats, and free-text search. Cards are ranked by your weighted
   score with per-dimension bars, key specs, price (CAD) and quick pros/cons.

3. **Compare side-by-side.** Add up to 4 trims to the compare tray and open a
   full matrix — specs, every score (best-in-set highlighted green), overall match
   at your weights, and full pros/cons.

4. **Details.** Each trim opens a full card: specs, all scores, pros/cons, notable
   features, and the **brand's reliability, warranty and maintenance picture**.

## How scoring works

Each trim is scored 0–100 (higher = better) on six dimensions, computed
deterministically in `../scripts/build_database.py`. The weighted **composite** is
done live in the browser so re-weighting is instant.

| Dimension | Basis |
|---|---|
| **Reliability** | Brand dependability. J.D. Power 2025 VDS (PP100, lower better): **Lexus 140 · BMW 189 · Mercedes 243 · Audi 273**; cross-checked vs Consumer Reports 2025-26. |
| **Low running cost** | Maintenance + repair + free-service/warranty value. Lexus ~$551/yr typical repair vs ~$900–990 for the German three; Mercedes costliest long-term. |
| **Value** | Price vs the average of its body-style peers in the dataset. |
| **Luxury / tech** | Equipment count + price-tier proxy. |
| **Efficiency** | Combined L/100km (ICE/hybrid) or electric range (EV). |
| **Performance** | Power and 0–100 km/h. |

### Why the Lexus lean is honest

Lexus is **#1 in J.D. Power dependability three years running** and costs roughly
**half** the German brands to maintain over 10 years. The German three counter with
more power and sharper dynamics. The default profile rewards the former; the sliders
let you decide how much that's worth to you.

## Data & caveats

- **Market:** Canada, **CAD MSRP** (most German prices exclude freight/PDI ~$2,500–5,050;
  Lexus prices include freight/PDI per lexus.ca). Confirm with a dealer before purchase.
- **Lexus** data is the rich lexus.ca dataset (`../data/lexus.json`). **BMW / Mercedes /
  Audi** data was researched from each brand's Canadian site + reputable outlets
  (AutoTrader.ca, CarCostCanada, Edmunds, The Car Guide, J.D. Power). Some German-brand
  figures are estimates — flagged **"est."** in the UI and via a `confidence` field.
- **2026 nuances captured:** e.g. BMW M4 CS dropped for 2026; Audi Q8 e-tron
  discontinued (final year 2025); Mercedes A-Class / gas CLA / CLS discontinued and
  EQE/EQS "350→320 / 450→…" renames; Audi A6/S6 e-tron model-year skip.

## Rebuild the dataset

```
# 1) (re)gather German-brand trims into data/research/{bmw,mercedes,audi}.json
#    per data/research/SCHEMA.md
# 2) merge + score -> data/database.json + compare/db.js
python3 scripts/build_database.py
```

## Files

```
scripts/build_database.py   merge Lexus + research files, compute scores
data/research/SCHEMA.md     schema for the per-brand research files
data/research/*.json        BMW / Mercedes / Audi researched trim data
data/database.json          canonical unified dataset
compare/index.html          the app shell
compare/styles.css          styling
compare/app.js              filtering, weighting, compare, scoring UI
compare/db.js               generated dataset (window.DB)
```
