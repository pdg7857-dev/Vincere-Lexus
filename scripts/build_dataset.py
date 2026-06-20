#!/usr/bin/env python3
"""
Normalize raw Lexus data (data/raw/*) into a single app dataset: data/lexus.json

Joins:
  spec_<slug>.json  (trims + per-trim feature availability matrix, grouped)
  price_<SERIES>.json (per-province MSRP per trim, package price, lease terms)

Output dataset powers:
  - the questionnaire / cross-matcher (precomputed per-trim "satisfies" want sets)
  - the reverse "everything to know" vehicle browser (full grouped spec sheet)
  - the single-feature finder

Run:  python3 scripts/build_dataset.py
"""
import json
import glob
import os
import re
from collections import defaultdict, Counter
from datetime import date

RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "lexus.json")

DEFAULT_PROVINCE = "ON"

# Lexus Canada warranty coverage (scraped from lexus.ca/en/know-your-lexus/coverage/).
# "core" applies to every vehicle; the rest are added by powertrain class.
WARRANTY = {
    "core": [
        {"name": "Comprehensive", "term": "48 mo / 80,000 km"},
        {"name": "Powertrain & Safety Restraints", "term": "72 mo / 110,000 km"},
        {"name": "Corrosion Perforation", "term": "72 mo / unlimited km"},
        {"name": "Roadside Assistance (24/7)", "term": "48 mo / unlimited km"},
    ],
    "combustion": [  # gas / hybrid / plug-in (anything with an engine)
        {"name": "Emission Control Components", "term": "48 mo / 80,000 km"},
        {"name": "Major Emission Control Components", "term": "96 mo / 130,000 km"},
    ],
    "hybrid": [
        {"name": "Hybrid System & Battery", "term": "96 mo / 160,000 km"},
    ],
    "phev": [
        {"name": "Hybrid System & Battery", "term": "96 mo / 160,000 km"},
    ],
    "ev": [
        {"name": "EV Battery (capacity)", "term": "120 mo / 240,000 km"},
        {"name": "EV / Fuel Cell Components", "term": "96 mo / 160,000 km"},
    ],
    "note": "Lexus Canada New Vehicle Limited Warranty. Whichever comes first. "
            "Confirm current terms with the warranty booklet.",
    "source": "lexus.ca/en/know-your-lexus/coverage/",
}

# Finance is computed live in the app from an editable APR/term the consultant sets to
# today's Lexus Financial Services rate (purchase-finance rates change weekly). Lease
# payments are the exact advertised offer from the Build & Price pricing API.
FINANCE = {
    "defaultApr": 6.99,
    "defaultTermMonths": 60,
    "defaultDown": 0,
    "note": "Finance payments are estimates at the APR/term you set — adjust to today's "
            "Lexus Financial Services rate. Lease payments are the advertised offer.",
}


def powertrain_class(slug, powertrain):
    if slug == "rz":
        return "ev"
    if slug in ("nxp", "rxp"):
        return "phev"
    if powertrain == "hybrid":
        return "hybrid"
    return "gas"

# Body-style / category per model slug (current CA lineup).
CATEGORY = {
    "es": ("Sedan", "Luxury Sedan"),
    "is": ("Sedan", "Sport Sedan"),
    "ls": ("Sedan", "Flagship Sedan"),
    "lc": ("Coupe", "Luxury Coupe"),
    "lcv": ("Convertible", "Luxury Convertible"),
    "nx": ("SUV", "Compact SUV"),
    "nxp": ("SUV", "Compact Plug-in Hybrid SUV"),
    "rx": ("SUV", "Midsize SUV"),
    "rxp": ("SUV", "Midsize Plug-in Hybrid SUV"),
    "rz": ("SUV", "Electric SUV"),
    "gx": ("SUV", "Body-on-frame SUV"),
    "lx": ("SUV", "Flagship SUV"),
    "tx": ("SUV", "3-Row SUV"),
    "uxh": ("SUV", "Subcompact SUV"),
}

# A "Remove:" / "removed" spec row means the package DELETES a feature -> never counts as having it.
def is_removal(name):
    n = name.lower()
    return n.startswith("remove:") or n.startswith("remove ") or "removed" in n or ": removed" in n


# -------- Customer "wants": the questionnaire vocabulary --------
# kind "name": satisfied if the trim has ANY feature whose name matches a pattern.
# kind "attr": satisfied by a derived attribute predicate (evaluated in code).
# Patterns are case-insensitive regex on the feature name.
WANTS = [
    # Comfort & climate
    dict(id="heated_seats", label="Heated front seats", cat="Comfort & Climate", kind="name",
         patterns=[r"heated front seats", r"heated & ventilated front", r"heated front & 2nd row",
                   r"ventilated front seats", r"ventilated front & 2nd row"],
         note="On Lexus, ventilated front seats are always also heated."),
    dict(id="cooled_seats", label="Ventilated / cooled front seats", cat="Comfort & Climate", kind="name",
         patterns=[r"ventilated front seats", r"heated & ventilated front", r"ventilated front & 2nd row"]),
    dict(id="heated_rear", label="Heated rear seats", cat="Comfort & Climate", kind="name",
         patterns=[r"heated rear seats", r"heated 2nd row", r"heated front & 2nd row", r"ventilated 2nd row",
                   r"ventilated rear seats", r"ventilated front & 2nd row"]),
    dict(id="heated_wheel", label="Heated steering wheel", cat="Comfort & Climate", kind="name",
         patterns=[r"heated.*steering wheel"]),
    dict(id="massage", label="Massage seats", cat="Comfort & Climate", kind="name",
         patterns=[r"massage seat"]),
    dict(id="tri_zone", label="3+ zone climate control", cat="Comfort & Climate", kind="name",
         patterns=[r"3-zone", r"4-zone", r"triple zone", r"three.zone"]),
    dict(id="rear_sunshade", label="Rear power sunshade", cat="Comfort & Climate", kind="name",
         patterns=[r"rear power sunshade", r"power sunshade", r"rear door sunshade"]),

    # Seating & space
    dict(id="third_row", label="Third-row seating (6+ seats)", cat="Seating & Space", kind="attr",
         attr="seats_ge6"),
    dict(id="captain", label="Second-row captain's chairs", cat="Seating & Space", kind="name",
         patterns=[r"2nd row captain"]),
    dict(id="leather", label="Genuine leather seats", cat="Seating & Space", kind="name",
         patterns=[r"leather seats", r"semi-aniline leather", r"smooth leather"],
         note="Excludes NuLuxe synthetic upholstery."),
    dict(id="memory_seat", label="Driver seat memory", cat="Seating & Space", kind="name",
         patterns=[r"driver seat memory", r"driver memory", r"memory system"]),

    # Technology
    dict(id="hud", label="Head-Up Display", cat="Technology", kind="name",
         patterns=[r"head-up display"]),
    dict(id="big_screen", label='14" touchscreen', cat="Technology", kind="name",
         patterns=[r"14.\s*hd touchscreen", r"interface with 14"]),
    dict(id="digital_mirror", label="Digital rear-view mirror", cat="Technology", kind="name",
         patterns=[r"digital display rear view mirror"]),
    dict(id="wireless_charge", label="Wireless phone charger", cat="Technology", kind="name",
         patterns=[r"wireless charg", r"wireless phone charger"]),
    dict(id="wireless_carplay", label="Wireless Apple CarPlay / Android Auto", cat="Technology", kind="name",
         patterns=[r"wireless apple carplay", r"wireless android auto"]),
    dict(id="digital_key", label="Digital key (phone as key)", cat="Technology", kind="name",
         patterns=[r"digital key"]),
    dict(id="surround_cam", label="360° camera / Panoramic View Monitor", cat="Technology", kind="name",
         patterns=[r"panoramic view monitor", r"multi.terrain monitor"]),
    dict(id="self_park", label="Advanced Park (self-parking)", cat="Technology", kind="name",
         patterns=[r"advanced park"]),

    # Audio
    dict(id="mark_levinson", label="Mark Levinson premium audio", cat="Audio", kind="name",
         patterns=[r"mark levinson"]),

    # Exterior & visibility
    dict(id="pano_roof", label="Panoramic moonroof", cat="Exterior & Roof", kind="name",
         patterns=[r"panoramic moonroof"]),
    dict(id="moonroof", label="Moonroof / sunroof", cat="Exterior & Roof", kind="name",
         patterns=[r"moonroof", r"retractable roof"]),
    dict(id="power_liftgate", label="Power liftgate / trunk", cat="Exterior & Roof", kind="name",
         patterns=[r"power back door", r"power rear door", r"power open/close trunk"]),
    dict(id="handsfree_liftgate", label="Hands-free liftgate (kick sensor)", cat="Exterior & Roof", kind="name",
         patterns=[r"kick sensor"]),
    dict(id="adaptive_lights", label="Adaptive headlights", cat="Exterior & Roof", kind="name",
         patterns=[r"adaptive front lighting", r"adaptive high-beam", r"triple-beam led"]),
    dict(id="soft_close", label="Soft-close / easy-close doors", cat="Exterior & Roof", kind="name",
         patterns=[r"soft close doors", r"easy close doors"]),
    dict(id="rain_wipers", label="Rain-sensing wipers", cat="Exterior & Roof", kind="name",
         patterns=[r"rain sensing wipers"]),

    # Performance & drive
    dict(id="awd", label="All-wheel drive", cat="Performance & Drive", kind="attr", attr="awd"),
    dict(id="avs", label="Adaptive / air suspension", cat="Performance & Drive", kind="name",
         patterns=[r"adaptive variable suspension", r"air suspension"]),
    dict(id="fsport", label="F SPORT styling / handling", cat="Performance & Drive", kind="name",
         patterns=[r"f sport", r"f-sport"]),
    dict(id="paddles", label="Paddle shifters", cat="Performance & Drive", kind="name",
         patterns=[r"paddle shifters"]),

    # Capability
    dict(id="towing", label="Towing capability", cat="Capability", kind="attr", attr="towing"),
    dict(id="offroad", label="Off-road hardware (Multi-Terrain/Crawl)", cat="Capability", kind="name",
         patterns=[r"multi-terrain select", r"crawl control", r"trail mode", r"downhill assist",
                   r"locking rear differential"]),

    # Safety
    dict(id="blind_spot", label="Blind Spot Monitor", cat="Safety", kind="name",
         patterns=[r"blind spot monitor"]),
    dict(id="latest_safety", label="Latest Lexus Safety System+ (3.0/4.0)", cat="Safety", kind="attr",
         attr="lss_latest"),

    # ---- expanded vocabulary ----
    # Comfort & climate
    dict(id="ambient_lighting", label="Ambient interior lighting", cat="Comfort & Climate", kind="name",
         patterns=[r"ambient.*illumination", r"ambient lighting", r"64 colour", r"shadow.*illumination",
                   r"dynamic illumination"]),
    dict(id="rear_climate", label="Rear climate control / rear vents", cat="Comfort & Climate", kind="name",
         patterns=[r"rear passenger vents", r"4-zone", r"triple zone independent"]),
    dict(id="cool_box", label="Cooled centre console", cat="Comfort & Climate", kind="name",
         patterns=[r"cool box"]),
    dict(id="neck_heater", label="Neck / radiant heater", cat="Comfort & Climate", kind="name",
         patterns=[r"neck heater", r"knee heater", r"radiant"]),

    # Seating & space
    dict(id="premium_leather", label="Premium semi-aniline leather", cat="Seating & Space", kind="name",
         patterns=[r"semi-aniline"]),
    dict(id="sport_interior", label="Sport interior (Ultrasuede/Alcantara)", cat="Seating & Space", kind="name",
         patterns=[r"ultrasuede", r"alcantara"]),
    dict(id="power_3rd_row", label="Power-folding third row", cat="Seating & Space", kind="name",
         patterns=[r"power folding third row", r"3rd row power folding", r"power folding.*third"]),

    # Technology
    dict(id="digital_cluster", label='Digital gauge cluster (12.3")', cat="Technology", kind="name",
         patterns=[r"12\.3.*digital gauge", r"digital gauge cluster", r"full tft", r"tft.*instrumentation"]),
    dict(id="rear_entertainment", label="Rear-seat entertainment screens", cat="Technology", kind="name",
         patterns=[r"rear seat entertainment"]),
    dict(id="parking_assist", label="Parking assist with auto-braking", cat="Technology", kind="name",
         patterns=[r"intuitive parking assist", r"parking support brake", r"advanced park"]),

    # Audio
    dict(id="satellite_radio", label="SiriusXM satellite radio", cat="Audio", kind="name",
         patterns=[r"siriusxm"]),

    # Exterior & roof
    dict(id="roof_rails", label="Roof rails (roof-rack ready)", cat="Exterior & Roof", kind="name",
         patterns=[r"roof rails"]),
    dict(id="running_boards", label="Running boards", cat="Exterior & Roof", kind="name",
         patterns=[r"running board"]),
    dict(id="big_wheels", label='20-inch or larger wheels', cat="Exterior & Roof", kind="name",
         patterns=[r"\b2[012]\s*[\"”'’].{0,40}(alloy|wheel|aluminum)", r"\b2[012].\s*forged alloy"]),

    # Performance & drive
    dict(id="rear_steer", label="Rear-wheel steering / dynamic handling", cat="Performance & Drive", kind="name",
         patterns=[r"dynamic rear steering", r"4 wheel active steering", r"lexus dynamic handling",
                   r"variable gear ratio steering"]),
    dict(id="lsd", label="Limited-slip differential", cat="Performance & Drive", kind="name",
         patterns=[r"limited.slip", r"torsen", r"locking rear differential", r"sport differential"]),
    dict(id="perf_brakes", label="Performance brakes (Brembo)", cat="Performance & Drive", kind="name",
         patterns=[r"brembo", r"opposed 6-piston", r"monoblock"]),
    dict(id="sport_modes", label="Sport+ / performance drive modes", cat="Performance & Drive", kind="name",
         patterns=[r"sport s\+", r"sport s/s\+", r"sport\+ mode", r"drive mode select with sport"]),

    # Capability
    dict(id="tow_hitch", label="Tow hitch / trailer package", cat="Capability", kind="name",
         patterns=[r"tow hitch", r"towing receiver", r"trailer ball", r"class iv", r"trailer brake"]),

    # Safety
    dict(id="driver_monitor", label="Driver attention monitor", cat="Safety", kind="name",
         patterns=[r"driver monitor camera"]),
    dict(id="safe_exit", label="Safe Exit Assist", cat="Safety", kind="name",
         patterns=[r"safe exit"]),
]


def load_prices():
    """modelCode -> packageCode -> { province: {start, pkg, payment, rate, term, km} }"""
    idx = defaultdict(lambda: defaultdict(dict))
    series_cfg = {}
    for f in glob.glob(os.path.join(RAW, "price_*.json")):
        data = json.load(open(f))
        if not isinstance(data, dict):
            continue
        for prov, years in data.items():
            for year, series in years.items():
                for scode, models in series.items():
                    for mcode, pkgs in models.items():
                        for p in pkgs:
                            pc = p["packageCode"]
                            idx[mcode][pc][prov] = {
                                "start": round(p["vehicleStartPrice"]["amount"]),
                                "pkg": round(p["packagePrice"]["amount"]),
                                "payment": round(p["paymentAmount"]["amount"]),
                                "rate": p["rate"]["amount"],
                                "term": int(p["numberOfTerms"]["amount"]),
                                "km": int(p["annualKm"]["amount"]),
                                "basePackage": p.get("basePackage", False),
                            }
    # series freight / config
    try:
        s = json.load(open(os.path.join(RAW, "series.json")))
        for it in s["data"]["brandV2ByPath"]["item"]["seriesFragmentPath"]:
            cfg = {c["configurationName"]: c["configurationValue"] for c in it.get("priceConfigurations", [])}
            series_cfg[it["seriesCode"]] = cfg
    except Exception:
        pass
    return idx, series_cfg


def num(v):
    """Extract leading number from a value like '2850 (112.2)' or '7'."""
    if v is None:
        return None
    m = re.search(r"-?\d[\d,]*\.?\d*", str(v))
    return float(m.group(0).replace(",", "")) if m else None


def build():
    price_idx, series_cfg = load_prices()
    feature_catalog = {}          # specId -> {name, group, sub}
    name_freq = defaultdict(Counter)
    models_out = []
    provinces = set()

    for f in sorted(glob.glob(os.path.join(RAW, "spec_*.json"))):
        slug = os.path.basename(f)[5:-5]
        d = json.load(open(f))
        cat, subtitle = CATEGORY.get(slug, ("Vehicle", ""))
        # Pull current-year wrapper (last = newest)
        wrapper = d["specificationModelsWrapperList"][-1]
        year = wrapper.get("year", "")
        model_name = wrapper["modelCardDataList"][0]["tciModelDescription"].split(" Hybrid")[0]

        # Per-modelId: pkg -> {specId: value}, plus dimensions and removals
        feat = defaultdict(lambda: defaultdict(dict))   # modelId -> pkg -> {specId: value}
        dims = defaultdict(lambda: defaultdict(dict))    # modelId -> pkg -> {specName: value}
        group_of = {}                                    # specId -> (group, sub)

        for g in wrapper["specGroups"]:
            gname = g["name"]
            for sub in g["specSubgroups"]:
                sname = sub["name"]
                for spec in sub["specs"]:
                    sid = spec["id"]
                    nm = spec["name"].strip()
                    removal = is_removal(nm)
                    if not removal:
                        feature_catalog.setdefault(sid, {"group": gname, "sub": sname})
                        name_freq[sid][nm] += 1
                        group_of[sid] = (gname, sname)
                    for m in spec.get("models", []):
                        mid = m["id"]
                        seen = set()
                        for pd in m.get("packageDataList", []):
                            pk = pd["id"]
                            if pk in seen:
                                continue
                            seen.add(pk)
                            val = pd.get("value", "") or ""
                            if gname == "Dimensions":
                                dims[mid][pk][nm] = val
                            if removal:
                                continue
                            feat[mid][pk][sid] = val

        # Build variants
        variants = []
        for mc in wrapper["modelCardDataList"]:
            mid = mc["modelId"]
            pkgs = []
            seenpk = set()
            for p in mc["packageList"]:
                if p["id"] in seenpk:
                    continue
                seenpk.add(p["id"])
                pkgs.append((p["id"], p["value"], p.get("basePackage", False)))

            trims = []
            for pid, pname, isbase in pkgs:
                fmap = dict(feat[mid].get(pid, {}))
                dmap = dict(dims[mid].get(pid, {}))
                price = price_idx.get(mid, {}).get(pid, {})
                for pr in price:
                    provinces.add(pr)
                # derived attributes
                seats = num(dmap.get("Seating Capacity"))
                drivetrain = (dmap.get("Drivetrain") or dmap.get("Drive Type") or "").strip()
                tow = num(dmap.get("Towing Capacity kg (lbs.)"))
                attrs = {
                    "seats": int(seats) if seats else None,
                    "drivetrain": drivetrain,
                    "horsepower": dmap.get("Horsepower (kW)", ""),
                    "torque": dmap.get("Total Torque (lb-ft)", ""),
                    "engine_cyl": dmap.get("Number Cylinders", ""),
                    "fuel_l100": dmap.get("Fuel Consumption - City/Highway/Combined L/100km", ""),
                    "ev_range": dmap.get("Est. Electric Driving Range (km)", "") or dmap.get("Total Driving Range (km)", ""),
                    "towing_kg": int(tow) if tow else None,
                    "cargo": dmap.get("Cargo Capacity L (cu. Ft.)", ""),
                    "length": dmap.get("Length mm (in.)", ""),
                }
                # satisfied wants
                feat_names = {feature_catalog and name_freq[sid].most_common(1)[0][0].lower(): sid for sid in fmap}
                names_lower = [name_freq[sid].most_common(1)[0][0].lower() for sid in fmap]
                satisfies = []
                for w in WANTS:
                    ok = False
                    if w["kind"] == "name":
                        for pat in w["patterns"]:
                            if any(re.search(pat, nm) for nm in names_lower):
                                ok = True
                                break
                    else:  # attr
                        a = w["attr"]
                        if a == "seats_ge6":
                            ok = bool(attrs["seats"] and attrs["seats"] >= 6)
                        elif a == "awd":
                            dt = drivetrain.upper()
                            ok = ("AWD" in dt or "ALL" in dt or "4WD" in dt or
                                  any(re.search(r"all-wheel drive|on-demand awd|awd-e|direct 4", nm) for nm in names_lower))
                        elif a == "towing":
                            ok = bool(attrs["towing_kg"] and attrs["towing_kg"] > 0)
                        elif a == "lss_latest":
                            ok = any(group_of.get(sid, ("", ""))[1] in
                                     ("Lexus Safety System+ 3.0", "Lexus Safety System+ 4.0") for sid in fmap)
                    if ok:
                        satisfies.append(w["id"])

                trims.append({
                    "id": pid,
                    "name": pname,
                    "isBase": isbase,
                    "price": price,
                    "attrs": attrs,
                    "satisfies": satisfies,
                    "features": fmap,   # specId -> value
                })

            # sort trims by base-province starting price
            def sortkey(t):
                p = t["price"].get(DEFAULT_PROVINCE) or next(iter(t["price"].values()), {})
                return p.get("start", 1e12)
            trims.sort(key=sortkey)

            img = mc.get("image", {}).get("url", "")
            variants.append({
                "modelId": mid,
                "name": mc.get("modelLongDescription", mc.get("modelDescription", "")),
                "powertrain": mc.get("powertrain", ""),
                "ptClass": powertrain_class(slug, mc.get("powertrain", "")),
                "electrified": mc.get("electrified", False),
                "image": img,
                "trims": trims,
            })

        # sort variants by cheapest trim
        variants.sort(key=lambda v: min((t["price"].get(DEFAULT_PROVINCE, {}).get("start", 1e12)
                                         or 1e12) for t in v["trims"]) if v["trims"] else 1e12)

        models_out.append({
            "slug": slug,
            "name": model_name,
            "category": cat,
            "subtitle": subtitle,
            "year": year,
            "variants": variants,
        })

    # Finalize feature catalog names (most common name per id)
    for sid, meta in feature_catalog.items():
        meta["name"] = name_freq[sid].most_common(1)[0][0]

    # sort models: SUVs, sedans, coupe, convertible, by price
    order = {"SUV": 0, "Sedan": 1, "Coupe": 2, "Convertible": 3}
    models_out.sort(key=lambda m: (order.get(m["category"], 9), m["name"]))

    wants_meta = [{"id": w["id"], "label": w["label"], "cat": w["cat"], "note": w.get("note", "")} for w in WANTS]

    dataset = {
        "meta": {
            "generated": date.today().isoformat(),
            "source": "lexus.ca (EN) — specifications + Build & Price pricing APIs",
            "defaultProvince": DEFAULT_PROVINCE,
            "currency": "CAD",
            "priceNote": "Starting prices as shown on lexus.ca Build & Price (include freight/PDI). "
                         "Trim-to-trim package deltas are exact. Confirm final pricing before quoting.",
            "modelCount": len(models_out),
            "warranty": WARRANTY,
            "finance": FINANCE,
        },
        "provinces": sorted(provinces),
        "wants": wants_meta,
        "featureCatalog": feature_catalog,
        "models": models_out,
    }
    json.dump(dataset, open(OUT, "w"), separators=(",", ":"), ensure_ascii=False)
    # Also emit as a JS file so the app can be opened directly (file://) without a server.
    app_data = os.path.join(os.path.dirname(__file__), "..", "showroom", "data.js")
    os.makedirs(os.path.dirname(app_data), exist_ok=True)
    with open(app_data, "w") as fh:
        fh.write("window.LEXUS_DATA=")
        json.dump(dataset, fh, separators=(",", ":"), ensure_ascii=False)
        fh.write(";")

    # ---- report ----
    nt = sum(len(v["trims"]) for m in models_out for v in m["variants"])
    nv = sum(len(m["variants"]) for m in models_out)
    print(f"Models: {len(models_out)}  Variants: {nv}  Trims: {nt}  Features: {len(feature_catalog)}")
    print(f"Provinces: {sorted(provinces)}")
    print(f"Wants: {len(wants_meta)}")
    print(f"Wrote {OUT} ({os.path.getsize(OUT):,} bytes)")
    # quick coverage sanity: wants with zero matches anywhere
    cover = Counter()
    for m in models_out:
        for v in m["variants"]:
            for t in v["trims"]:
                for s in t["satisfies"]:
                    cover[s] += 1
    zero = [w["id"] for w in WANTS if cover[w["id"]] == 0]
    print("Wants never matched (check patterns):", zero or "none")


if __name__ == "__main__":
    build()
