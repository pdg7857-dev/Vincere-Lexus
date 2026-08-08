#!/usr/bin/env python3
"""
Shared HTTP + parsing helpers for the sourcing adapters.

Everything here is stdlib-only and errs on the side of being a polite, honest
client:

  * a real, identifiable User-Agent (with a contact URL) — not a spoofed browser,
  * conservative rate-limiting between requests,
  * robots.txt awareness, so a scrape adapter can check before it fetches,
  * schema.org JSON-LD extraction (the same platform-agnostic technique already
    used by scripts/scrape_inventory.py).

Direct HTML scraping of Auto Trader is against its Terms of Service; these
helpers exist so the *fallback* scrape adapter behaves responsibly, but the
compliant primary path is a licensed data API (see adapters/marketcheck.py).
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
import urllib.robotparser
from typing import Optional

# Identify ourselves honestly. Swap in your real contact URL.
USER_AGENT = (
    "VincereSourcingBot/0.1 (+https://github.com/pdg7857-dev/vincere-lexus; "
    "car-sourcing research)"
)
DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9",
}

# be gentle: minimum seconds between requests to the same host
MIN_DELAY_S = 2.0
_last_request_at = 0.0


class Blocked(Exception):
    """Raised when a host actively refuses us (403 / WAF challenge)."""


def _throttle():
    global _last_request_at
    wait = MIN_DELAY_S - (time.monotonic() - _last_request_at)
    if wait > 0:
        time.sleep(wait)
    _last_request_at = time.monotonic()


def fetch(url: str, tries: int = 3, timeout: int = 30,
          headers: Optional[dict] = None) -> Optional[str]:
    """GET a URL politely. Returns text, or None on failure. Raises Blocked on 403."""
    last = None
    for i in range(tries):
        _throttle()
        try:
            req = urllib.request.Request(url, headers=headers or DEFAULT_HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (403, 429):
                raise Blocked(
                    f"{url} returned {e.code} — the site is refusing automated "
                    f"access (WAF / rate limit). Use the licensed-API adapter, or "
                    f"run from an allowed network."
                ) from e
        except Exception as e:  # noqa: BLE001 - network is best-effort
            last = e
        time.sleep(2 * (i + 1))
    print(f"  !! fetch failed {url}: {last}")
    return None


def robots_allows(url: str, user_agent: str = USER_AGENT) -> bool:
    """Check the host's robots.txt. Fails open only if robots.txt is unreachable."""
    try:
        m = re.match(r"(https?://[^/]+)", url)
        if not m:
            return False
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(m.group(1) + "/robots.txt")
        rp.read()
        return rp.can_fetch(user_agent, url)
    except Exception:  # noqa: BLE001
        return True


def jsonld_objects(html: str) -> list[dict]:
    """Extract every schema.org JSON-LD object (incl. @graph members) from HTML."""
    out: list[dict] = []
    for m in re.finditer(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
        html, re.S | re.I,
    ):
        try:
            data = json.loads(m.group(1).strip())
        except Exception:  # noqa: BLE001
            continue
        items = data if isinstance(data, list) else [data]
        for d in items:
            if isinstance(d, dict):
                out.append(d)
                if isinstance(d.get("@graph"), list):
                    out.extend(x for x in d["@graph"] if isinstance(x, dict))
    return out


def http_json(url: str, timeout: int = 30, headers: Optional[dict] = None):
    """GET and parse JSON (for API adapters). Returns parsed data or None."""
    txt = fetch(url, timeout=timeout, headers=headers)
    if txt is None:
        return None
    try:
        return json.loads(txt)
    except Exception as e:  # noqa: BLE001
        print(f"  !! bad JSON from {url}: {e}")
        return None
