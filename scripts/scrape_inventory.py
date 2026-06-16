#!/usr/bin/env python3
"""
Build the dealer inventory snapshot used by the cart / stock cross-reference.

  data/inventory.json   (canonical)   +   app/inventory.js   (window.LEXUS_INVENTORY)

Two modes:

  python3 scripts/scrape_inventory.py            # live scrape of the dealer site
  python3 scripts/scrape_inventory.py --sample   # generate a labelled SAMPLE snapshot
                                                  # (from data/lexus.json) for demos

Live scrape: the dealer (northwestlexus.com) runs on the EDealer platform and, like
virtually all modern dealer sites, emits schema.org JSON-LD `Vehicle`/`Car` data on
each vehicle detail page (VDP) for Google Vehicle Ads / SEO. We enumerate VDPs from
the sitemap and read that structured data — platform-agnostic and stable.

NOTE: northwestlexus.com is behind a Cloudflare WAF. Run the live scrape from a normal
network/IP (e.g. your machine); datacentre IPs are often challenged. The script fails
gracefully and tells you if it is blocked.
"""
import argparse
import glob
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import date

DEALER = {
    "name": "Northwest Lexus",
    "url": "https://www.northwestlexus.com",
    "city": "Brampton, ON",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9",
}
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_JSON = os.path.join(ROOT, "data", "inventory.json")
OUT_JS = os.path.join(ROOT, "app", "inventory.js")


def fetch(url, tries=3, timeout=30):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 403:
                raise SystemExit(
                    f"\n  Blocked (HTTP 403 / Cloudflare) fetching {url}\n"
                    "  Run this from a normal network/IP, not a datacentre/proxy.\n")
            last = e
        except Exception as e:  # noqa
            last = e
        time.sleep(2 * (i + 1))
    print(f"  !! failed {url}: {last}", file=sys.stderr)
    return None


# ---------------- live scrape (JSON-LD) ----------------
def collect_vdp_urls():
    urls, seen = [], set()
    smaps = [DEALER["url"] + "/sitemap.xml"]
    while smaps:
        sm = smaps.pop()
        if sm in seen:
            continue
        seen.add(sm)
        xml = fetch(sm)
        if not xml:
            continue
        locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)
        for loc in locs:
            if loc.endswith(".xml") and "sitemap" in loc.lower():
                smaps.append(loc)
            elif re.search(r"/(new|used|certified|inventory|vehicle)[-/]", loc, re.I):
                urls.append(loc)
    return list(dict.fromkeys(urls))


def jsonld_objects(html):
    out = []
    for m in re.finditer(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
                         html, re.S | re.I):
        try:
            data = json.loads(m.group(1).strip())
        except Exception:
            continue
        out.extend(data if isinstance(data, list) else [data])
        if isinstance(data, dict) and isinstance(data.get("@graph"), list):
            out.extend(data["@graph"])
    return out


def num(x):
    if x is None:
        return None
    m = re.search(r"\d[\d,]*\.?\d*", str(x))
    return round(float(m.group(0).replace(",", ""))) if m else None


def odo(obj):
    m = obj.get("mileageFromOdometer")
    if isinstance(m, dict):
        return num(m.get("value"))
    return num(m)


def parse_vehicle(obj, url):
    t = obj.get("@type", "")
    t = " ".join(t) if isinstance(t, list) else str(t)
    if not re.search(r"Car|Vehicle|Product", t, re.I):
        return None
    offers = obj.get("offers") or {}
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    avail = str(offers.get("availability", "")).split("/")[-1] or "Unknown"
    brand = obj.get("brand")
    brand = brand.get("name") if isinstance(brand, dict) else brand
    img = obj.get("image")
    img = img[0] if isinstance(img, list) else img
    cond_raw = (str(obj.get("itemCondition", "")) + " " + str(obj.get("name", "")) +
                " " + str(obj.get("vehicleConfiguration", ""))).lower()
    is_used = "used" in cond_raw or odo(obj)
    certified = "certified" in cond_raw or "cpo" in cond_raw
    condition = "Certified Pre-Owned" if certified else ("Used" if is_used else "New")
    return {
        "vin": obj.get("vehicleIdentificationNumber") or obj.get("sku") or "",
        "stock": obj.get("sku") or "",
        "year": num(obj.get("modelDate") or obj.get("productionDate") or obj.get("vehicleModelDate")),
        "model": (obj.get("model") if isinstance(obj.get("model"), str) else (obj.get("model") or {}).get("name", "")) or obj.get("name", ""),
        "trim": obj.get("vehicleConfiguration") or obj.get("trim") or "",
        "exterior": (obj.get("color") or obj.get("vehicleInteriorColor") or ""),
        "price": num(offers.get("price")),
        "odometer": odo(obj),
        "condition": condition,
        "certified": certified,
        "status": "In stock" if "InStock" in avail else avail,
        "type": "used" if condition != "New" else "new",
        "url": obj.get("url") or url,
        "image": img or "",
        "brand": brand or "Lexus",
    }


def scrape_live(limit):
    print(f"Enumerating VDPs from {DEALER['url']} sitemap …")
    vdps = collect_vdp_urls()
    print(f"  found {len(vdps)} candidate vehicle URLs")
    if limit:
        vdps = vdps[:limit]
    units = []
    for i, url in enumerate(vdps, 1):
        html = fetch(url)
        if not html:
            continue
        for obj in jsonld_objects(html):
            u = parse_vehicle(obj, url)
            if u and u["vin"]:
                units.append(u)
                break
        if i % 25 == 0:
            print(f"  …{i}/{len(vdps)} ({len(units)} units)")
        time.sleep(0.3)
    return units, False


# ---------------- sample generator ----------------
SAMPLE_COLOURS = ["Eminent White Pearl", "Caviar", "Atomic Silver", "Cloudburst Grey",
                  "Nori Green Pearl", "Matador Red Mica", "Ultra White", "Grecian Water",
                  "Manganese Lustre", "Iridium"]


def make_sample():
    data = json.load(open(os.path.join(ROOT, "data", "lexus.json")))
    units = []
    n = 0
    cur_year = int(data["meta"].get("generated", "2026")[:4])

    def add(v, t, model, condition, n):
        new_price = (t["price"].get("ON") or {}).get("start")
        colour = SAMPLE_COLOURS[n % len(SAMPLE_COLOURS)]
        if condition == "New":
            year, km, price = (int(model["year"]) if str(model["year"]).isdigit() else cur_year), None, new_price
            url = DEALER["url"] + "/new-vehicles"
        else:
            age = 1 + (n % 4)                                   # 1-4 years old
            year = cur_year - age
            km = 12000 * age + (n % 5) * 1500                    # plausible odometer
            price = round((new_price or 50000) * (0.90 - 0.06 * age) / 100) * 100 if new_price else None
            url = DEALER["url"] + ("/certified-vehicles" if condition.startswith("Cert") else "/used-vehicles")
        units.append({
            "vin": f"SAMPLE{n:05d}XXXXXXXXX"[:17], "stock": f"SMP{1000 + n}",
            "year": year, "model": v["name"], "trim": t["name"], "exterior": colour,
            "price": price, "odometer": km, "condition": condition,
            "certified": condition.startswith("Cert"),
            "status": "In transit" if (condition == "New" and n % 4 == 0) else "In stock",
            "type": "new" if condition == "New" else "used",
            "url": url, "image": v.get("image", ""), "brand": "Lexus",
        })

    # New stock across popular models/trims
    for slug in ["nx", "rx", "es", "gx", "tx", "rz", "is", "uxh", "nxp", "lx"]:
        model = next((m for m in data["models"] if m["slug"] == slug), None)
        if not model:
            continue
        for v in model["variants"][:2]:
            for t in v["trims"][:3]:
                if n % 2 and t["isBase"]:
                    continue
                add(v, t, model, "New", n); n += 1
                if n % 3 == 0:
                    break

    # Pre-owned (Certified Pre-Owned + Used) across the most-shopped lines
    for slug in ["nx", "rx", "es", "is", "gx", "ux", "uxh", "tx", "lx", "rz"]:
        model = next((m for m in data["models"] if m["slug"] == slug), None)
        if not model:
            continue
        v = model["variants"][0]
        for t in v["trims"][:3]:
            cond = "Certified Pre-Owned" if n % 2 == 0 else "Used"
            add(v, t, model, cond, n); n += 1
            if n % 2:
                break
    return units, True


# ---------------- ingest pre-extracted listing JSON ----------------
LEXUS_CODES = ("nx", "rx", "rz", "es", "is", "ls", "lc", "gx", "lx", "tx", "ux")


def _grade(s):
    g = re.sub(r"\b(package|grade|group)\b", "", s, flags=re.I).strip(" -–")
    g = re.sub(r"\s+", " ", g).title()
    return g.replace("F Sport", "F SPORT").replace("Blackline", "BLACKLINE").strip()


def normalize_listing(it):
    """Map a {year,model,trim,condition,price,odometer_km,...} listing to the app schema."""
    raw_model = (it.get("model") or "").strip()
    raw_trim = (it.get("trim") or "").strip()
    base = re.sub(r"^(lexus|toyota)\s+", "", raw_model, flags=re.I).strip()
    code = base.split()[0].lower() if base else ""
    is_lexus = "lexus" in raw_model.lower() or code in LEXUS_CODES

    model_full, grade = base, raw_trim
    if is_lexus:
        if " - " in raw_trim:                      # new/demo: "350 AWD - PREMIUM PACKAGE"
            left, right = raw_trim.split(" - ", 1)
            engine = left.split()[0]
            model_full = f"{base.split()[0]} {engine}"
            grade = _grade(right)
        else:                                       # used: "NX 350 Sportdesign" or "350h"
            m = re.match(r"^([A-Za-z]{1,3})\s*(\d+[a-z+]*)\s*(.*)$", raw_trim)
            if m:
                model_full = f"{m.group(1).upper()} {m.group(2)}"
                grade = _grade(m.group(3))
            else:
                m2 = re.match(r"^(\d+[a-z+]*)\b\s*(.*)$", raw_trim)
                if m2:
                    model_full = f"{base.split()[0]} {m2.group(1)}"
                    grade = _grade(m2.group(2))
    cond = it.get("condition") or "New"
    return {
        "vin": it.get("vin", ""), "stock": it.get("stock_number", ""),
        "year": it.get("year"), "model": model_full, "trim": grade,
        "exterior": it.get("exterior_color", ""), "price": it.get("price"),
        "odometer": it.get("odometer_km"), "condition": cond,
        "certified": bool(re.search(r"cert", cond, re.I)),
        "status": "In stock", "type": "new" if cond == "New" else "used",
        "url": (DEALER["url"] + it["url"]) if it.get("url", "").startswith("/") else it.get("url", ""),
        "image": it.get("image", ""), "brand": "Lexus" if is_lexus else (raw_model.split()[0] if raw_model else ""),
    }


def ingest(paths):
    raw = []
    for p in paths:
        for f in (glob.glob(os.path.join(p, "*.json")) if os.path.isdir(p) else [p]):
            d = json.load(open(f))
            raw.extend(d if isinstance(d, list) else d.get("units", []))
    units, seen = [], set()
    for it in raw:
        vin = it.get("vin") or it.get("stock_number")
        if vin in seen:
            continue
        seen.add(vin)
        units.append(normalize_listing(it))
    return units, False


def emit(units, sample):
    units = [u for u in units if u.get("model")]
    dataset = {
        "meta": {
            "dealer": DEALER["name"], "url": DEALER["url"], "city": DEALER["city"],
            "scraped": date.today().isoformat(),
            "count": len(units),
            "sample": sample,
            "note": ("SAMPLE inventory for demo — run `python3 scripts/scrape_inventory.py` "
                     "from an un-blocked network to load live Northwest Lexus stock."
                     if sample else
                     "Live snapshot from northwestlexus.com — refresh by re-running the scraper."),
        },
        "units": units,
    }
    json.dump(dataset, open(OUT_JSON, "w"), separators=(",", ":"), ensure_ascii=False)
    with open(OUT_JS, "w") as f:
        f.write("window.LEXUS_INVENTORY=")
        json.dump(dataset, f, separators=(",", ":"), ensure_ascii=False)
        f.write(";")
    tag = "SAMPLE" if sample else "LIVE"
    print(f"[{tag}] wrote {len(units)} units -> {OUT_JSON} and {OUT_JS}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", action="store_true", help="generate a labelled sample snapshot")
    ap.add_argument("--ingest", nargs="+", metavar="PATH",
                    help="normalize pre-extracted listing JSON file(s)/dir into the snapshot")
    ap.add_argument("--limit", type=int, default=0, help="max VDPs to scrape (live mode)")
    args = ap.parse_args()
    if args.ingest:
        units, sample = ingest(args.ingest)
    elif args.sample:
        units, sample = make_sample()
    else:
        units, sample = scrape_live(args.limit)
    emit(units, sample)
