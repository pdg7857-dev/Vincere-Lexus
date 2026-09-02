#!/usr/bin/env python3
"""
Dealer inventory scraper for northwestlexus.com (EDealer platform).

Strategy (platform-agnostic, stable):
  1. Walk /sitemap.xml (following sitemap-index files) to enumerate every
     vehicle detail page (VDP).
  2. On each VDP read the schema.org JSON-LD `Vehicle`/`Car`/`Product` block
     that the site emits for Google Vehicle Ads. That gives stock #, VIN, year,
     model, trim, price, odometer, colour, and the photo gallery.

Cloudflare note: northwestlexus.com sits behind a Cloudflare WAF. Datacentre
IPs (incl. GitHub-hosted runners) are frequently challenged with HTTP 403. The
scraper raises `Blocked` so the caller can report it clearly and, if needed,
fall back to a self-hosted runner on a normal network. See README.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request

DEALER_URL = "https://www.northwestlexus.com"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9",
}


class Blocked(RuntimeError):
    """Raised when the site returns 403 (typically Cloudflare on a datacentre IP)."""


def fetch(url: str, tries: int = 3, timeout: int = 30) -> str | None:
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (403, 503):
                raise Blocked(
                    f"HTTP {e.code} fetching {url} — Cloudflare is challenging this IP. "
                    "Run from a normal network (see README: self-hosted runner)."
                )
            last = e
        except Exception as e:  # noqa: BLE001
            last = e
        time.sleep(2 * (i + 1))
    print(f"  !! failed {url}: {last}", file=sys.stderr)
    return None


# ---------------------------------------------------------------- sitemap walk
def collect_vdp_urls() -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    queue = [DEALER_URL + "/sitemap.xml"]
    while queue:
        sm = queue.pop()
        if sm in seen:
            continue
        seen.add(sm)
        xml = fetch(sm)
        if not xml:
            continue
        for loc in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml):
            if loc.endswith(".xml") and "sitemap" in loc.lower():
                queue.append(loc)
            elif re.search(r"/(inventory|new|used|certified|vehicle)[-/]", loc, re.I):
                urls.append(loc)
    return list(dict.fromkeys(urls))


# ------------------------------------------------------------------- JSON-LD
def jsonld_objects(html: str) -> list[dict]:
    out: list[dict] = []
    for m in re.finditer(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S | re.I
    ):
        try:
            data = json.loads(m.group(1).strip())
        except Exception:  # noqa: BLE001
            continue
        items = data if isinstance(data, list) else [data]
        for it in items:
            out.append(it)
            if isinstance(it, dict) and isinstance(it.get("@graph"), list):
                out.extend(it["@graph"])
    return out


def _num(x):
    if x is None:
        return None
    m = re.search(r"\d[\d,]*\.?\d*", str(x))
    return round(float(m.group(0).replace(",", ""))) if m else None


def _odo(obj: dict):
    m = obj.get("mileageFromOdometer")
    if isinstance(m, dict):
        return _num(m.get("value"))
    return _num(m)


def _images(obj: dict, html: str) -> list[str]:
    """All photo URLs for a VDP: JSON-LD image list first, then CDN URLs in page."""
    imgs: list[str] = []
    raw = obj.get("image")
    if isinstance(raw, str):
        imgs.append(raw)
    elif isinstance(raw, list):
        for i in raw:
            if isinstance(i, str):
                imgs.append(i)
            elif isinstance(i, dict) and i.get("url"):
                imgs.append(i["url"])
    # Supplement with obvious vehicle-photo CDN URLs found in the page markup
    # (EDealer serves gallery images from image CDNs; keep only sizable jpgs).
    for u in re.findall(r'https?://[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html, re.I):
        if re.search(r"(logo|icon|sprite|placeholder|badge|dealer-logo)", u, re.I):
            continue
        imgs.append(u)
    # De-dupe, preserve order
    return list(dict.fromkeys(imgs))


def parse_vehicle(obj: dict, url: str, html: str) -> dict | None:
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
    model = obj.get("model")
    if isinstance(model, dict):
        model = model.get("name", "")
    cond_raw = (
        str(obj.get("itemCondition", "")) + " " + str(obj.get("name", "")) + " "
        + str(obj.get("vehicleConfiguration", ""))
    ).lower()
    is_used = "used" in cond_raw or bool(_odo(obj))
    certified = "certified" in cond_raw or "cpo" in cond_raw
    condition = "Certified Pre-Owned" if certified else ("Used" if is_used else "New")
    return {
        "vin": obj.get("vehicleIdentificationNumber") or obj.get("sku") or "",
        "stock": (obj.get("sku") or "").strip(),
        "year": _num(obj.get("modelDate") or obj.get("vehicleModelDate") or obj.get("productionDate")),
        "model": (model or obj.get("name", "")).strip(),
        "trim": (obj.get("vehicleConfiguration") or obj.get("trim") or "").strip(),
        "exterior": (obj.get("color") or "").strip(),
        "price": _num(offers.get("price")),
        "odometer": _odo(obj),
        "condition": condition,
        "certified": certified,
        "status": "In stock" if "InStock" in avail else avail,
        "url": obj.get("url") or url,
        "images": _images(obj, html),
        "brand": brand or "Lexus",
        "description": (obj.get("description") or "").strip(),
    }


def scrape_inventory(limit: int = 0, sleep: float = 0.3) -> list[dict]:
    """Return a list of unit dicts for every vehicle currently on the site."""
    vdps = collect_vdp_urls()
    if limit:
        vdps = vdps[:limit]
    units: list[dict] = []
    for i, url in enumerate(vdps, 1):
        html = fetch(url)
        if not html:
            continue
        for obj in jsonld_objects(html):
            u = parse_vehicle(obj, url, html)
            if u and (u["vin"] or u["stock"]):
                units.append(u)
                break
        if i % 25 == 0:
            print(f"  …{i}/{len(vdps)} pages ({len(units)} units)")
        time.sleep(sleep)
    return units
