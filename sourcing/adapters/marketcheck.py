#!/usr/bin/env python3
"""
MarketCheck adapter — the COMPLIANT, PRIMARY data source.

MarketCheck (marketcheck.com) licenses aggregated new/used vehicle listing data
across Canada & the US via a documented REST API, including Auto Trader-sourced
inventory, without you having to scrape anyone. This is the source a real
sourcing business should run on: it's reliable, it's in their Terms, and it
won't break when a site changes its HTML or turns up its bot protection.

  * Sign up:      https://www.marketcheck.com/apis
  * Set the key:  export MARKETCHECK_API_KEY=...    (never commit it)

Other drop-in alternatives that fit this same adapter shape: Auto.dev, CarsXE,
or an official Auto Trader dealer/partner feed if you qualify for one. Copy this
file, change the endpoint + field mapping, and register it in __init__.py.

This adapter is written against MarketCheck's documented field names; if your
plan returns slightly different keys, adjust `_to_listing`. It degrades
gracefully (returns nothing, explains why) when no key is set, so the pipeline
still runs on the `sample` source.
"""
from __future__ import annotations

import os
import urllib.parse
from typing import Iterable

from ..models import Listing, Want, to_int
from ..util import http_json
from .base import SearchAdapter

API_BASE = "https://mc-api.marketcheck.com/v2/search/car/active"


class MarketCheckAdapter(SearchAdapter):
    name = "marketcheck"

    def __init__(self):
        self.api_key = os.environ.get("MARKETCHECK_API_KEY", "").strip()

    def available(self) -> bool:
        return bool(self.api_key)

    def unavailable_reason(self) -> str:
        return ("MARKETCHECK_API_KEY is not set. Get a key at "
                "https://www.marketcheck.com/apis and `export MARKETCHECK_API_KEY=...`")

    def _params(self, want: Want, start: int, rows: int) -> str:
        p = {
            "api_key": self.api_key,
            "country": "CA",
            "start": start,
            "rows": rows,
            "sort_by": "dom_active",   # freshest first
            "sort_order": "asc",
        }
        if want.make:
            p["make"] = "|".join(want.make)
        if want.model:
            p["model"] = "|".join(want.model)
        if want.year_min or want.year_max:
            p["year_range"] = f"{want.year_min or 1990}-{want.year_max or 2100}"
        if want.price_max or want.price_min:
            p["price_range"] = f"{want.price_min or 0}-{want.price_max or 10_000_000}"
        if want.km_max:
            p["miles_range"] = f"0-{want.km_max}"   # MarketCheck CA returns km
        if want.province:
            p["state"] = "|".join(want.province)
        return urllib.parse.urlencode(p)

    def search(self, want: Want) -> Iterable[Listing]:
        if not self.available():
            return
        rows, start = 50, 0
        while True:
            data = http_json(f"{API_BASE}?{self._params(want, start, rows)}")
            if not data:
                return
            listings = data.get("listings") or []
            for raw in listings:
                out = self._to_listing(raw)
                if out:
                    yield out
            start += rows
            if start >= min(int(data.get("num_found", 0)), 500):  # cap paging
                return

    def _to_listing(self, raw: dict) -> Listing | None:
        b = raw.get("build") or {}
        d = raw.get("dealer") or raw.get("seller") or {}
        seller_type = "dealer" if raw.get("seller_type", "dealer") == "dealer" else "private"
        return Listing(
            source=self.name,
            listing_id=str(raw.get("id") or raw.get("vin") or ""),
            vin=raw.get("vin", ""),
            stock=raw.get("stock_no", ""),
            year=to_int(b.get("year")),
            make=b.get("make", ""),
            model=b.get("model", ""),
            trim=b.get("trim", ""),
            price=to_int(raw.get("price")),
            odometer=to_int(raw.get("miles")),
            condition=(raw.get("inventory_type", "") or "").title(),
            body=b.get("body_type", ""),
            drivetrain=b.get("drivetrain", ""),
            transmission=b.get("transmission", ""),
            fuel=b.get("fuel_type", ""),
            exterior=raw.get("exterior_color", ""),
            interior=raw.get("interior_color", ""),
            city=d.get("city", ""),
            province=d.get("state", ""),
            seller_type=seller_type,
            seller_name=d.get("name", ""),
            url=raw.get("vdp_url", ""),
            image=(raw.get("media", {}).get("photo_links") or [""])[0],
            extra={"dom": raw.get("dom_active"), "description": raw.get("seller_comments", "")},
        )
