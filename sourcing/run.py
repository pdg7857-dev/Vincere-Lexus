#!/usr/bin/env python3
"""
Sourcing pipeline runner — the one command you schedule.

    # offline demo (no key, no network) — proves the whole pipeline works
    python3 -m sourcing.run --source sample

    # the real, compliant run once you have a MarketCheck key
    export MARKETCHECK_API_KEY=...
    python3 -m sourcing.run --source marketcheck --email

    # spot-check via the polite scraper (ToS-gray, usually WAF-blocked)
    python3 -m sourcing.run --source autotrader.ca

Flow:  load wants  ->  query source per want  ->  store + dedupe (first-seen)
       ->  match  ->  alert on new matches only.

Schedule it (e.g. cron / GitHub Actions) to check every few hours — the store
makes sure customers are only alerted about a given car once.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

from .adapters import available_sources, get_adapter
from .alert import ConsoleNotifier, EmailNotifier, JsonNotifier, send_digest
from .matcher import match_all
from .models import Listing, Want
from .store import Store

ROOT = os.path.join(os.path.dirname(__file__), "..")
DEFAULT_WANTS = os.path.join(ROOT, "data", "sourcing", "wants.example.json")


def load_wants(path: str) -> list[Want]:
    with open(path) as f:
        raw = json.load(f)
    items = raw.get("wants", raw) if isinstance(raw, dict) else raw
    return [Want.from_dict(w) for w in items]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Source cars for customers from a pluggable listing source.")
    ap.add_argument("--source", default="sample", choices=available_sources(),
                    help="data source adapter (default: sample)")
    ap.add_argument("--wants", default=DEFAULT_WANTS, help="path to wants JSON")
    ap.add_argument("--db", default=None, help="override sqlite path")
    ap.add_argument("--email", action="store_true", help="also send an email digest (needs SMTP env)")
    ap.add_argument("--json", action="store_true", help="also write data/sourcing/matches.json")
    ap.add_argument("--today", default=None, help="override 'today' (ISO date) for deterministic tests")
    args = ap.parse_args(argv)

    wants = load_wants(args.wants)
    active = [w for w in wants if w.active]
    print(f"Loaded {len(wants)} want(s), {len(active)} active. Source: {args.source}")

    adapter = get_adapter(args.source)
    if not adapter.available():
        print(f"\n!! source '{args.source}' is not available: {adapter.unavailable_reason()}")
        print("   Falling back to nothing this run. (Try --source sample to see the pipeline.)")
        return 2

    store = Store(args.db) if args.db else Store(today=args.today) if args.today else Store()

    # ---- fetch + store --------------------------------------------------- #
    seen: dict[str, Listing] = {}
    new_count = drop_count = 0
    for w in active:
        for lst in adapter.search(w):
            info = store.upsert(lst)
            new_count += 1 if info["new"] else 0
            if info["price_drop"]:
                drop_count += 1
                lst.extra["price_drop"] = info["price_drop"]
            seen[lst.dedupe_key()] = lst   # dedupe across wants within a run
    store.commit()
    listings = list(seen.values())
    s = store.stats()
    print(f"Fetched {len(listings)} unique listing(s): {new_count} new, "
          f"{drop_count} price-drop. Store now holds {s['total']}.")

    # ---- match + alert --------------------------------------------------- #
    matches = match_all(active, listings)
    print(f"{len(matches)} listing/want match(es) before de-dup of prior alerts.")

    notifiers = [ConsoleNotifier()]
    if args.json:
        notifiers.append(JsonNotifier())
    if args.email:
        notifiers.append(EmailNotifier())

    fresh = send_digest(matches, store, notifiers)
    print(f"\n{len(fresh)} NEW match(es) alerted this run.")
    store.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
