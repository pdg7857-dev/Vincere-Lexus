#!/usr/bin/env python3
"""
Scrape raw Lexus Canada vehicle data into data/raw/.

Two clean JSON sources are pulled (no HTML scraping of content):

  1. AEM spec model.json  -> per-model trims + full feature availability matrix
     (.../vehicles/<slug>/specifications/.../vehicle_specificatio.model.json)

  2. Build & Price prices.json -> per-province MSRP per trim, package price, lease terms
     (/bin/api/price_calculation/lexus/prices.json?brand=lexus&series=<CODE>)

  3. BnP-get-series-lexus -> series list + per-series price configs (freight, etc.)

Run:  python3 scripts/scrape.py
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

BASE = "https://www.lexus.ca"
RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
os.makedirs(RAW, exist_ok=True)

# Current Canadian lineup (RC / RC F discontinued -> redirect to IS; es-all-electric -> ES page)
MODEL_SLUGS = [
    "es", "gx", "is", "lc", "lcv", "ls", "lx",
    "nx", "nxp", "rx", "rxp", "rz", "tx", "uxh",
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; LexusTrimMatcher/1.0)"}


def fetch(url, tries=4, timeout=45, follow=True):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa
            last = e
            time.sleep(2 * (i + 1))
    print(f"  !! failed {url}: {last}", file=sys.stderr)
    return None


def save(name, text):
    path = os.path.join(RAW, name)
    with open(path, "w") as f:
        f.write(text)
    print(f"  saved {name} ({len(text):,} bytes)")


def scrape_specs():
    print("== Spec model.json per model ==")
    found = {}
    for slug in MODEL_SLUGS:
        html = fetch(f"{BASE}/en/vehicles/{slug}/specifications/")
        if not html:
            print(f"  {slug}: no specs page")
            continue
        m = re.search(
            r"/content/lexus/en/vehicles/[^\"']*vehicle_specificatio\.model\.json", html
        )
        if not m:
            print(f"  {slug}: no spec model path in page")
            continue
        data = fetch(BASE + m.group(0))
        if not data:
            continue
        save(f"spec_{slug}.json", data)
        found[slug] = m.group(0)
    save("_spec_paths.json", json.dumps(found, indent=2))


def scrape_series_and_prices():
    print("== Series list ==")
    series_txt = fetch(BASE + "/graphql/execute.json/tcidigital/BnP-get-series-lexus")
    if not series_txt:
        print("  !! could not fetch series list")
        return
    save("series.json", series_txt)
    series = json.loads(series_txt)["data"]["brandV2ByPath"]["item"]["seriesFragmentPath"]
    codes = [s["seriesCode"] for s in series]

    print(f"== Prices per series ({len(codes)} series) ==")
    for code in codes:
        url = f"{BASE}/bin/api/price_calculation/lexus/prices.json?brand=lexus&series={code}"
        txt = fetch(url)
        if not txt:
            continue
        # Skip non-JSON (error pages) and empty payloads
        try:
            obj = json.loads(txt)
        except json.JSONDecodeError:
            continue
        if not obj:
            continue
        save(f"price_{code}.json", txt)


if __name__ == "__main__":
    scrape_specs()
    scrape_series_and_prices()
    print("Done.")
