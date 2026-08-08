#!/usr/bin/env python3
"""
autotrader.ca adapter — the POLITE-SCRAPE FALLBACK.

⚠️  Scraping autotrader.ca is against Auto Trader's Terms of Service, and the
site is behind an aggressive bot defence (Cloudflare + a JSON search backend
that expects a real browser session). Treat this as a *fallback of last resort*
for spot checks, not the backbone of the business — the licensed MarketCheck
adapter is the primary path. This adapter is written to be well-behaved:

  * it checks robots.txt before fetching,
  * it identifies itself honestly (no browser spoofing) and rate-limits,
  * it reads the schema.org JSON-LD that listing pages emit for Google Vehicle
    Ads (the same platform-agnostic technique as scripts/scrape_inventory.py),
  * and it fails loudly-but-gracefully when the WAF blocks it, telling you to
    fall back to the API.

Because of the WAF this will usually return nothing from a datacentre / proxy
IP — that is expected, and is exactly why the compliant API is the default.
"""
from __future__ import annotations

import urllib.parse
from typing import Iterable

from ..models import Listing, Want, to_int
from ..util import Blocked, fetch, jsonld_objects, robots_allows
from .base import SearchAdapter

BASE = "https://www.autotrader.ca"


class AutoTraderCaAdapter(SearchAdapter):
    name = "autotrader.ca"

    def __init__(self, max_pages: int = 2):
        self.max_pages = max_pages

    def _search_url(self, want: Want, page: int) -> str:
        # autotrader.ca's public search takes make/model/price/km as query params.
        # A city + radius (e.g. "Toronto, ON" + 50 km) targets a metro like the GTA;
        # otherwise fall back to a province-wide / nationwide search.
        if want.city:
            loc, prx = want.city, (want.radius_km or 50)
        elif want.province:
            loc, prx = want.province[0], -1
        else:
            loc, prx = "", -1
        q = {
            "rcp": 100,                       # results per page
            "rcs": page * 100,                # offset
            "srt": 35,                        # sort: newest listed
            "prx": prx,                       # proximity radius in km (-1 = anywhere)
            "loc": loc,
            "hprc": want.price_max or "",
            "yRng": f"{want.year_min or ''},{want.year_max or ''}",
            "kmRng": f",{want.km_max or ''}",
        }
        if want.make:
            q["make"] = want.make[0]
        if want.model:
            q["model"] = want.model[0]
        return f"{BASE}/cars/?" + urllib.parse.urlencode({k: v for k, v in q.items() if v != ""})

    def search(self, want: Want) -> Iterable[Listing]:
        for page in range(self.max_pages):
            url = self._search_url(want, page)
            if not robots_allows(url):
                print(f"  robots.txt disallows {url} — skipping (as it should).")
                return
            try:
                html = fetch(url)
            except Blocked as e:
                print(f"  {self.name}: {e}")
                return
            if not html:
                return
            found = 0
            for obj in jsonld_objects(html):
                lst = self._to_listing(obj, url)
                if lst:
                    found += 1
                    yield lst
            if found == 0:
                # No JSON-LD on the search page (rendered client-side) — stop rather
                # than hammer. This is the common outcome; use the API adapter.
                return

    def _to_listing(self, obj: dict, url: str) -> Listing | None:
        t = obj.get("@type", "")
        t = " ".join(t) if isinstance(t, list) else str(t)
        if "Car" not in t and "Vehicle" not in t and "Product" not in t:
            return None
        offers = obj.get("offers") or {}
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        brand = obj.get("brand")
        brand = brand.get("name") if isinstance(brand, dict) else (brand or "")
        model = obj.get("model")
        model = model.get("name") if isinstance(model, dict) else (model or obj.get("name", ""))
        odo = obj.get("mileageFromOdometer")
        odo = odo.get("value") if isinstance(odo, dict) else odo
        img = obj.get("image")
        img = img[0] if isinstance(img, list) else (img or "")
        return Listing(
            source=self.name,
            listing_id=str(obj.get("sku") or obj.get("vehicleIdentificationNumber") or obj.get("url") or ""),
            vin=obj.get("vehicleIdentificationNumber", "") or "",
            year=to_int(obj.get("modelDate") or obj.get("vehicleModelDate")),
            make=brand,
            model=model,
            trim=obj.get("vehicleConfiguration", "") or "",
            price=to_int(offers.get("price")),
            odometer=to_int(odo),
            condition="Used" if to_int(odo) else "New",
            exterior=obj.get("color", "") or "",
            url=obj.get("url") or url,
            image=img,
            extra={"description": obj.get("description", "")},
        )
