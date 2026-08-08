#!/usr/bin/env python3
"""
Canonical data models for the sourcing pipeline.

Two records flow through the system:

  Listing  — one vehicle for sale, normalised from any source (a licensed API,
             a polite scrape, or the sample fixtures). Every adapter emits these,
             so the store / matcher / alerter never care where a car came from.

  Want     — one customer's sourcing brief: "2022+ Lexus RX 350 AWD, under
             $55k, under 60,000 km, in Ontario." The matcher scores Listings
             against these.

  Match    — a Listing that satisfies a Want, with a score and human-readable
             reasons (for the alert digest and for your own audit trail).

Deliberately stdlib-only (dataclasses + json), matching the rest of the repo.
The Listing field set is a superset of the dealer-inventory schema already used
in data/inventory.json, so the two data sets stay comparable.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field, fields
from typing import Any, Optional


# --------------------------------------------------------------------------- #
#  Listing — one vehicle for sale (source-agnostic)
# --------------------------------------------------------------------------- #
@dataclass
class Listing:
    source: str = ""            # "marketcheck" | "autotrader.ca" | "sample" | ...
    listing_id: str = ""        # source-native id; used with `source` as the dedupe key
    vin: str = ""               # secondary dedupe key (a car can be relisted / cross-posted)
    stock: str = ""

    year: Optional[int] = None
    make: str = ""
    model: str = ""
    trim: str = ""

    price: Optional[int] = None      # CAD
    odometer: Optional[int] = None   # km
    condition: str = ""              # "New" | "Used" | "Certified Pre-Owned"

    body: str = ""
    drivetrain: str = ""             # e.g. "AWD", "FWD"
    transmission: str = ""
    fuel: str = ""
    exterior: str = ""
    interior: str = ""

    city: str = ""
    province: str = ""               # "ON", "BC", ...
    seller_type: str = ""            # "dealer" | "private"
    seller_name: str = ""

    url: str = ""
    image: str = ""

    # store-managed timestamps (ISO date strings); set by the store, not adapters
    first_seen: str = ""
    last_seen: str = ""

    # anything source-specific the adapter wants to keep around
    extra: dict = field(default_factory=dict)

    def dedupe_key(self) -> str:
        """Stable identity for a listing across runs."""
        if self.vin:
            return f"vin:{self.vin.upper()}"
        return f"{self.source}:{self.listing_id}"

    # a flat blob of text used for keyword must/nice matching
    def haystack(self) -> str:
        parts = [
            self.make, self.model, self.trim, self.body, self.drivetrain,
            self.transmission, self.fuel, self.exterior, self.interior,
            self.condition, str(self.extra.get("description", "")),
        ]
        return " ".join(p for p in parts if p).lower()

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Listing":
        known = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in d.items() if k in known})


# --------------------------------------------------------------------------- #
#  Want — one customer's sourcing brief
# --------------------------------------------------------------------------- #
@dataclass
class Want:
    id: str = ""
    customer: str = ""               # who this is for (name / contact label)

    make: list[str] = field(default_factory=list)     # any-of; empty = any make
    model: list[str] = field(default_factory=list)    # any-of; empty = any model
    trim_contains: str = ""          # substring the trim must contain (optional)

    year_min: Optional[int] = None
    year_max: Optional[int] = None
    price_max: Optional[int] = None
    price_min: Optional[int] = None
    km_max: Optional[int] = None

    condition: list[str] = field(default_factory=list)   # e.g. ["Used","Certified Pre-Owned"]
    province: list[str] = field(default_factory=list)     # any-of; empty = anywhere

    must: list[str] = field(default_factory=list)   # keywords that MUST all appear
    nice: list[str] = field(default_factory=list)   # keywords that boost the score

    notes: str = ""
    active: bool = True

    @classmethod
    def from_dict(cls, d: dict) -> "Want":
        known = {f.name for f in fields(cls)}
        clean = {k: v for k, v in d.items() if k in known}
        # tolerate scalars where a list is expected ("Lexus" -> ["Lexus"])
        for key in ("make", "model", "condition", "province", "must", "nice"):
            v = clean.get(key)
            if isinstance(v, str):
                clean[key] = [v]
        return cls(**clean)


# --------------------------------------------------------------------------- #
#  Match — a Listing that satisfied a Want
# --------------------------------------------------------------------------- #
@dataclass
class Match:
    want: Want
    listing: Listing
    score: float
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "want_id": self.want.id,
            "customer": self.want.customer,
            "score": round(self.score, 1),
            "reasons": self.reasons,
            "listing": self.listing.to_dict(),
        }


# --------------------------------------------------------------------------- #
#  small shared parsing helpers
# --------------------------------------------------------------------------- #
def to_int(x: Any) -> Optional[int]:
    """Pull the first number out of anything ('$54,900' -> 54900)."""
    if x is None or isinstance(x, bool):
        return None
    m = re.search(r"\d[\d,]*\.?\d*", str(x))
    return round(float(m.group(0).replace(",", ""))) if m else None
