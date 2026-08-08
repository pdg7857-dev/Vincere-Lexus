#!/usr/bin/env python3
"""Adapter registry. Add a new data source here and it's available on the CLI."""
from __future__ import annotations

from .autotrader_ca import AutoTraderCaAdapter
from .base import SearchAdapter
from .marketcheck import MarketCheckAdapter
from .sample import SampleAdapter

# name -> factory. Order = suggested preference (compliant first).
_REGISTRY = {
    "marketcheck": MarketCheckAdapter,   # licensed API — the primary path
    "autotrader.ca": AutoTraderCaAdapter,  # polite-scrape fallback (ToS-gray, fragile)
    "sample": SampleAdapter,             # offline fixtures for dev / demo
}


def get_adapter(name: str) -> SearchAdapter:
    if name not in _REGISTRY:
        raise KeyError(f"unknown source '{name}'. Known: {', '.join(_REGISTRY)}")
    return _REGISTRY[name]()


def available_sources() -> list[str]:
    return list(_REGISTRY)
