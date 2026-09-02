#!/usr/bin/env python3
"""Known-stock state: which vehicles the watcher has already seen.

The state file is committed to the repo and updated each run, so the diff of
"what is on the site now" vs "what we have seen" identifies genuinely NEW cars.
"""
from __future__ import annotations

import datetime
import json
import os

STATE_PATH = os.path.join(os.path.dirname(__file__), "state", "known_stock.json")


def load_known() -> set[str]:
    if not os.path.exists(STATE_PATH):
        return set()
    with open(STATE_PATH) as f:
        data = json.load(f)
    return {s.strip() for s in data.get("known_stock", []) if s and s.strip()}


def save_known(stock: set[str], note: str | None = None) -> None:
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    payload = {
        "generated": datetime.date.today().isoformat(),
        "note": note
        or (
            "Baseline of stock numbers already in inventory, so the daily watcher "
            "only flags NEW arrivals. Updated automatically on each run."
        ),
        "known_stock": sorted(stock),
    }
    with open(STATE_PATH, "w") as f:
        json.dump(payload, f, indent=2)
