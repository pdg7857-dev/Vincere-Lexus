#!/usr/bin/env python3
"""
Build the unified 2026 luxury cross-reference database (Canada) from:
  - data/lexus.json            (existing rich Lexus dataset, lexus.ca)
  - data/research/bmw.json     (research agent output)
  - data/research/mercedes.json
  - data/research/audi.json

Output:
  - data/database.json         canonical unified dataset (every trim + per-dim scores)
  - compare/db.js              same payload as `window.DB = {...}` for the static app

Per-trim dimension scores are 0-100 (higher = better) and deterministic.
The weighted COMPOSITE is intentionally computed in the browser so the user can
re-weight live (default profile leans on reliability + ownership cost -> Lexus bias).
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def p(*a): return os.path.join(ROOT, *a)

# --------------------------------------------------------------------------
# Authoritative brand reference (Canada). Reliability + ownership are the
# bias-critical numbers, sourced and held constant across the dataset.
#   J.D. Power 2025 VDS PP100 (lower better): Lexus 140 / BMW 189 / MB 243 / Audi 273
#   Consumer Reports 2025-26: Lexus top-3; BMW top-5; Audi fell to #16; MB n/a
#   RepairPal-style annual repair: Lexus ~$551 / MB ~$908 / BMW ~$968 / Audi ~$987
# reliability100 / ownership100: 0-100, higher = better (more reliable / cheaper to own)
# --------------------------------------------------------------------------
BRANDS = {
    "Lexus": {
        "color": "#1a1a1a", "accent": "#c40e2e",
        "reliability100": 93, "ownership100": 92,
        "jdPowerPP100": 140,
        "reliabilityNote": "J.D. Power 2025 VDS #1 overall (140 PP100, 3rd year running); Consumer Reports top-3 brand.",
        "warranty": {"comprehensive": "4 yr / 80,000 km", "powertrain": "6 yr / 110,000 km",
                      "corrosion": "6 yr / unlimited", "roadside": "4 yr / unlimited",
                      "ev_battery": "10 yr / 240,000 km", "hybrid_battery": "8 yr / 160,000 km"},
        "maintenance": {"plan": "First scheduled service complimentary; Lexus prepaid maintenance optional",
                         "est5yrCad": 2200, "estAnnualCad": 560,
                         "note": "Lowest running costs of the four; ~half the German brands long-term."},
    },
    "BMW": {
        "color": "#16588E", "accent": "#16588E",
        "reliability100": 70, "ownership100": 52,
        "jdPowerPP100": 189,
        "reliabilityNote": "J.D. Power 2025 VDS best of the German three (189 PP100); Consumer Reports top-5 in 2025 but long-term repair costs are high.",
        "warranty": {"comprehensive": "4 yr / 80,000 km", "powertrain": "4 yr / 80,000 km",
                      "corrosion": "12 yr / unlimited", "roadside": "4 yr / unlimited",
                      "ev_battery": "8 yr / 160,000 km"},
        "maintenance": {"plan": "BMW Ultimate Care – 3 yr complimentary scheduled maintenance",
                         "est5yrCad": 4800, "estAnnualCad": 1250,
                         "note": "Free for 3 yrs, then expensive; ~$11k over 10 yrs (CR)."},
    },
    "Mercedes-Benz": {
        "color": "#00A19B", "accent": "#00A19B",
        "reliability100": 57, "ownership100": 42,
        "jdPowerPP100": 243,
        "reliabilityNote": "J.D. Power 2025 VDS 243 PP100 (above industry avg of 202 = worse); complex tech, costliest upkeep long-term.",
        "warranty": {"comprehensive": "4 yr / 80,000 km", "powertrain": "4 yr / 80,000 km",
                      "corrosion": "5 yr / unlimited", "roadside": "4 yr / unlimited",
                      "ev_battery": "8 yr / 160,000 km"},
        "maintenance": {"plan": "No brand-wide free maintenance; Star/Prepaid Maintenance is a paid add-on",
                         "est5yrCad": 5600, "estAnnualCad": 1400,
                         "note": "Highest running costs of the four; pay-from-day-one servicing."},
    },
    "Audi": {
        "color": "#BB0A30", "accent": "#BB0A30",
        "reliability100": 50, "ownership100": 50,
        "jdPowerPP100": 273,
        "reliabilityNote": "J.D. Power 2025 VDS 273 PP100 (worst of the four); Consumer Reports dropped Audi 10 spots to #16 in 2026.",
        "warranty": {"comprehensive": "4 yr / 80,000 km", "powertrain": "4 yr / 80,000 km",
                      "corrosion": "12 yr / unlimited", "roadside": "4 yr / unlimited",
                      "ev_battery": "8 yr / 160,000 km"},
        "maintenance": {"plan": "Audi complimentary scheduled maintenance – 3 yr (new for 2026); Audi Care prepaid optional",
                         "est5yrCad": 4600, "estAnnualCad": 1200,
                         "note": "Free for 3 yrs (new for 2026); German-typical costs after."},
    },
}

# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def first_int(s):
    if s is None: return None
    m = re.search(r"\d[\d,]*", str(s))
    return int(m.group(0).replace(",", "")) if m else None

def clamp(x, lo=1, hi=100): return max(lo, min(hi, x))

def comb_l100(s):
    """Lexus fuel string 'city/hwy/comb' -> combined float."""
    if not s: return None
    parts = [x for x in re.findall(r"\d+\.?\d*", str(s))]
    if not parts: return None
    if len(parts) >= 3: return float(parts[2])
    return float(parts[-1])

# --------------------------------------------------------------------------
# scoring (per-trim, 0-100, higher = better)
# --------------------------------------------------------------------------
def score_performance(hp, zero100):
    s = None
    if hp:
        s = clamp((hp - 150) / (650 - 150) * 100)
    if zero100:
        t = clamp((8.5 - zero100) / (8.5 - 3.0) * 100)
        s = t if s is None else 0.5 * s + 0.5 * t
    return round(s if s is not None else 35)

def score_efficiency(pt, fuel_l100, ev_range):
    pt = (pt or "").lower()
    if pt == "ev":
        base = 90
        if ev_range: base = clamp(78 + (ev_range - 350) / 12)
        return round(clamp(base, 60, 100))
    if pt == "phev":
        return 82
    if fuel_l100:
        return round(clamp((14.0 - fuel_l100) / (14.0 - 5.0) * 100))
    if pt in ("hybrid", "mild-hybrid"):
        return 70
    return 45

def score_value(price, seg_avg):
    if not price or not seg_avg: return 50
    return round(clamp(50 + (seg_avg - price) / seg_avg * 140))

def score_luxury(price, brand, nfeat):
    base = clamp(38 + (price - 38000) / 2300)
    base += min(nfeat, 12) * 0.6
    if brand in ("Mercedes-Benz", "Audi", "BMW"): base += 3
    return round(clamp(base))

# --------------------------------------------------------------------------
# Lexus conversion (from rich data/lexus.json)
# --------------------------------------------------------------------------
def lexus_proscons(model, pt, seats, perf_score):
    pros = ["Class-leading reliability (J.D. Power #1 dependability)",
            "Low maintenance & strong resale value",
            "Quiet, comfortable, well-built cabin"]
    cons = ["Less engaging to drive than German rivals",
            "Infotainment less flashy than BMW/Mercedes"]
    if pt in ("hybrid", "phev"): pros.append("Efficient electrified powertrain")
    if pt == "ev": pros.append("Smooth, refined EV with strong warranty")
    if perf_score >= 70: pros.append("Genuinely quick for a Lexus")
    else: cons.append("Performance is relaxed, not sporty")
    if seats and seats >= 7: pros.append("Three-row family practicality")
    return pros, cons

def load_lexus():
    d = json.load(open(p("data", "lexus.json")))
    out = []
    for m in d["models"]:
        body = m["category"]
        seg = m.get("subtitle", "") or f"Lexus {body}"
        for v in m["variants"]:
            ptmap = {"gas": "gas", "hybrid": "hybrid", "phev": "phev", "ev": "ev"}
            pt = ptmap.get(v.get("ptClass", "gas"), "gas")
            for t in v["trims"]:
                a = t.get("attrs", {})
                price = None
                pr = t.get("price", {})
                if isinstance(pr, dict):
                    on = pr.get("ON") or next(iter(pr.values()), None)
                    if isinstance(on, dict): price = on.get("start")
                hp = first_int(a.get("horsepower"))
                fuel = comb_l100(a.get("fuel_l100"))
                evr = first_int(a.get("ev_range"))
                rec = {
                    "brand": "Lexus", "model": m["name"], "bodyStyle": body, "segment": seg,
                    "trim": f"{v['name']} {t['name']}".strip(), "year": 2026,
                    "ptType": pt, "engine": (f"{a.get('engine_cyl','')}-cyl" if a.get('engine_cyl') else ("Electric" if pt=='ev' else "")),
                    "hp": hp, "torque": first_int(a.get("torque")),
                    "drivetrain": a.get("drivetrain"), "transmission": None,
                    "fuelL100": fuel, "evRangeKm": evr, "batteryKwh": None,
                    "zero100": None, "topSpeed": None,
                    "seats": a.get("seats"), "priceCad": price,
                    "notable": [], "pros": [], "cons": [],
                    "confidence": "high", "_nfeat": len(t.get("features", {})),
                    "image": v.get("image"),
                }
                out.append(rec)
    return out

# --------------------------------------------------------------------------
# Research-file conversion (BMW / Mercedes / Audi)
# --------------------------------------------------------------------------
def load_research(brand_key, fname):
    fp = p("data", "research", fname)
    if not os.path.exists(fp):
        print(f"  ! missing {fname} — skipping {brand_key}", file=sys.stderr)
        return []
    try:
        d = json.load(open(fp))
    except Exception as e:
        print(f"  ! {fname} failed to parse: {e}", file=sys.stderr)
        return []
    out = []
    for m in d.get("models", []):
        body = m.get("bodyStyle", "")
        seg = m.get("segment", "") or f"{brand_key} {body}"
        for t in m.get("trims", []):
            pw = t.get("powertrain", {}) or {}
            perf = t.get("perf", {}) or {}
            out.append({
                "brand": brand_key, "model": m.get("model"), "bodyStyle": body, "segment": seg,
                "trim": t.get("trim"), "year": 2026,
                "ptType": (pw.get("type") or "gas"), "engine": pw.get("engine"),
                "hp": pw.get("hp"), "torque": pw.get("torque_lbft"),
                "drivetrain": pw.get("drivetrain"), "transmission": pw.get("transmission"),
                "fuelL100": pw.get("fuel_l100_comb"), "evRangeKm": pw.get("ev_range_km"),
                "batteryKwh": pw.get("battery_kwh"),
                "zero100": perf.get("zero_100_s"), "topSpeed": perf.get("top_speed_kmh"),
                "seats": t.get("seats"), "priceCad": t.get("price_cad"),
                "notable": t.get("notable_features", []) or [],
                "pros": t.get("pros", []) or [], "cons": t.get("cons", []) or [],
                "confidence": t.get("confidence", "med"),
                "_nfeat": len(t.get("notable_features", []) or []),
                "modelReliability": m.get("modelReliability_100"),
                "image": None,
            })
    return out

# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------
def main():
    trims = []
    trims += load_lexus()
    trims += load_research("BMW", "bmw.json")
    trims += load_research("Mercedes-Benz", "mercedes.json")
    trims += load_research("Audi", "audi.json")

    # segment averages for value scoring (by bodyStyle)
    seg_prices = {}
    for t in trims:
        if t["priceCad"]:
            seg_prices.setdefault(t["bodyStyle"], []).append(t["priceCad"])
    seg_avg = {k: sum(v) / len(v) for k, v in seg_prices.items()}

    for t in trims:
        b = BRANDS[t["brand"]]
        rel = t.get("modelReliability") or b["reliability100"]
        perf = score_performance(t["hp"], t["zero100"])
        eff = score_efficiency(t["ptType"], t["fuelL100"], t["evRangeKm"])
        val = score_value(t["priceCad"], seg_avg.get(t["bodyStyle"]))
        lux = score_luxury(t["priceCad"] or 50000, t["brand"], t.get("_nfeat", 0))
        t["scores"] = {
            "reliability": rel, "performance": perf, "efficiency": eff,
            "value": val, "luxury": lux, "ownership": b["ownership100"],
        }
        # auto pros/cons for Lexus (source data has none)
        if t["brand"] == "Lexus":
            t["pros"], t["cons"] = lexus_proscons(t["model"], t["ptType"], t["seats"], perf)
        t.pop("_nfeat", None)
        t.pop("modelReliability", None)

    payload = {
        "meta": {
            "generated": "2026-06-16", "market": "Canada", "currency": "CAD", "year": 2026,
            "note": "2026 luxury cross-reference. Reliability/ownership from J.D. Power 2025 VDS, "
                    "Consumer Reports 2025-26, RepairPal-style cost data. Prices CAD MSRP — confirm before purchase.",
            "defaultWeights": {"reliability": 30, "ownership": 20, "value": 15,
                                "luxury": 15, "efficiency": 10, "performance": 10},
            "presets": {
                "Reliability-first (Lexus lean)": {"reliability": 30, "ownership": 20, "value": 15, "luxury": 15, "efficiency": 10, "performance": 10},
                "Balanced": {"reliability": 18, "ownership": 16, "value": 17, "luxury": 17, "efficiency": 16, "performance": 16},
                "Performance-first": {"reliability": 12, "ownership": 8, "value": 12, "luxury": 18, "efficiency": 8, "performance": 42},
                "Lowest running cost": {"reliability": 28, "ownership": 30, "value": 18, "luxury": 6, "efficiency": 14, "performance": 4},
            },
            "dimensions": ["reliability", "ownership", "value", "luxury", "efficiency", "performance"],
        },
        "brands": BRANDS,
        "trims": trims,
    }

    os.makedirs(p("compare"), exist_ok=True)
    json.dump(payload, open(p("data", "database.json"), "w"), indent=1)
    with open(p("compare", "db.js"), "w") as f:
        f.write("window.DB = ")
        json.dump(payload, f, separators=(",", ":"))
        f.write(";\n")

    by_brand = {}
    for t in trims:
        by_brand[t["brand"]] = by_brand.get(t["brand"], 0) + 1
    print("Built data/database.json + compare/db.js")
    print("Trims by brand:", by_brand, "| total:", len(trims))
    print("Body styles:", sorted(seg_avg))

if __name__ == "__main__":
    main()
