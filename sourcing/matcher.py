#!/usr/bin/env python3
"""
Matcher — score a Listing against a customer's Want.

Two stages:

  1. HARD FILTERS (make, model, year, price, km, condition, province, trim,
     must-have keywords). Fail any one and the listing is out — no score.
  2. SCORE the survivors 0-100 so the best cars float to the top of the alert:
       * price headroom under the customer's ceiling  (cheaper = better)
       * low kilometres                                 (fewer = better)
       * each nice-to-have keyword that appears
       * a freshness/CPO nudge

The score is a ranking aid for you, not a hard truth — every match still lists
its reasons so you can eyeball it before contacting a customer.
"""
from __future__ import annotations

from typing import Optional

from .models import Listing, Match, Want


def _any_match(needles: list[str], hay: str) -> bool:
    return any(n.lower() in hay for n in needles)


def match_one(want: Want, lst: Listing) -> Optional[Match]:
    hay = lst.haystack()
    reasons: list[str] = []

    # ---- hard filters ---------------------------------------------------- #
    if want.make and not _any_match(want.make, (lst.make or "").lower()):
        return None
    if want.model and not _any_match(want.model, (lst.model or "").lower()):
        return None
    if want.trim_contains and want.trim_contains.lower() not in (lst.trim or "").lower():
        return None
    if want.year_min and (lst.year or 0) < want.year_min:
        return None
    if want.year_max and (lst.year or 9999) > want.year_max:
        return None
    if want.price_max and (lst.price or 10**9) > want.price_max:
        return None
    if want.price_min and (lst.price or 0) < want.price_min:
        return None
    if want.km_max and (lst.odometer or 10**9) > want.km_max:
        return None
    if want.condition and not _any_match(want.condition, (lst.condition or "").lower()):
        return None
    if want.province and (lst.province or "").upper() not in [p.upper() for p in want.province]:
        return None
    for kw in want.must:
        if kw.lower() not in hay:
            return None  # a must-have that isn't present disqualifies the car
    if want.must:
        reasons.append("has all must-haves: " + ", ".join(want.must))

    # ---- score ----------------------------------------------------------- #
    score = 50.0

    if want.price_max and lst.price:
        headroom = (want.price_max - lst.price) / want.price_max      # 0..1
        score += max(0.0, min(headroom, 0.25)) * 80                    # up to +20
        if headroom > 0:
            reasons.append(f"${want.price_max - lst.price:,} under budget")

    if lst.odometer is not None:
        if want.km_max:
            frac = 1 - min(lst.odometer / want.km_max, 1)              # 0..1
            score += frac * 15                                         # up to +15
        if lst.odometer < 40000:
            reasons.append(f"low km ({lst.odometer:,})")

    hits = [n for n in want.nice if n.lower() in hay]
    if hits:
        score += min(len(hits), 5) * 4                                 # up to +20
        reasons.append("nice-to-haves: " + ", ".join(hits))

    if "certified" in (lst.condition or "").lower():
        score += 5
        reasons.append("certified pre-owned")

    return Match(want=want, listing=lst, score=round(min(score, 100.0), 1), reasons=reasons)


def match_all(wants: list[Want], listings: list[Listing]) -> list[Match]:
    """Every (active want × listing) pairing that survives the hard filters,
    sorted best-first."""
    out: list[Match] = []
    for w in wants:
        if not w.active:
            continue
        for lst in listings:
            m = match_one(w, lst)
            if m:
                out.append(m)
    out.sort(key=lambda m: m.score, reverse=True)
    return out
