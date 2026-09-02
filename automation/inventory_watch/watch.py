#!/usr/bin/env python3
"""
Northwest Lexus inventory watcher — the daily 7 AM job.

  scan the dealer site  ->  diff vs known stock  ->  for each NEW car:
     generate 3 OMVIC-safe Marketplace variants + upload its photos to Drive
  ->  notify Phil (Slack / email / job summary)  ->  update known-stock state.

Usage:
  python3 -m automation.inventory_watch.watch                # full run
  python3 automation/inventory_watch/watch.py --dry-run      # no uploads/notify/state write
  python3 automation/inventory_watch/watch.py --limit 15     # only scan first 15 pages (testing)
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))  # repo root on path

from automation.inventory_watch import dealer, state, notify  # noqa: E402
from automation.inventory_watch.copy import marketplace_copy  # noqa: E402
from automation.inventory_watch.drive import upload_photos  # noqa: E402

OUT_DIR = os.path.join(HERE, "out")


def _write_outputs(new_cars: list[dict], md: str) -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    stamp = datetime.date.today().isoformat()
    with open(os.path.join(OUT_DIR, f"new-{stamp}.md"), "w") as f:
        f.write(md + "\n")
    with open(os.path.join(OUT_DIR, f"new-{stamp}.json"), "w") as f:
        json.dump(new_cars, f, indent=2, ensure_ascii=False)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as f:
            f.write(md + "\n")


def run(limit: int = 0, dry_run: bool = False) -> int:
    print(f"Scanning northwestlexus.com … ({datetime.datetime.now().isoformat(timespec='seconds')})")
    try:
        units = dealer.scrape_inventory(limit=limit)
    except dealer.Blocked as e:
        print(f"\n  BLOCKED: {e}\n  The scan could not run from this IP. See README "
              "(run on a self-hosted runner on a normal network).", file=sys.stderr)
        return 2
    print(f"  {len(units)} vehicles on site")
    if not units:
        print("  no units parsed — nothing to do (possible layout change; check selectors)")
        return 0

    known = state.load_known()
    current = {u["stock"] for u in units if u.get("stock")}
    fresh = [u for u in units if u.get("stock") and u["stock"] not in known]
    print(f"  {len(known)} known, {len(current)} on site, {len(fresh)} NEW")

    new_cars: list[dict] = []
    for u in fresh:
        copy = marketplace_copy(u)
        drive_res = {"status": "skipped", "uploaded": 0}
        if not dry_run:
            drive_res = upload_photos(u)
        new_cars.append({"unit": u, "copy": copy, "drive": drive_res})
        tag = f"{u.get('year','')} {u.get('model','')} {u.get('trim','')} #{u.get('stock','')}"
        print(f"    + {tag.strip()} | copy:{copy['source']} | photos:{drive_res.get('status')}"
              f"({drive_res.get('uploaded',0)})")

    md = notify.build_markdown(new_cars)
    if dry_run:
        print("\n--- DRY RUN (no notify, no Drive upload, no state write) ---\n")
        print(md)
        return 0

    notify.notify(new_cars)
    _write_outputs(new_cars, md)
    state.save_known(known | current)
    print(f"\nDone. Flagged {len(new_cars)} new car(s); state now tracks {len(known | current)} stock #s.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="max VDP pages to scan (testing)")
    ap.add_argument("--dry-run", action="store_true", help="scan+diff+copy only; no uploads/notify/state")
    args = ap.parse_args()
    raise SystemExit(run(limit=args.limit, dry_run=args.dry_run))
