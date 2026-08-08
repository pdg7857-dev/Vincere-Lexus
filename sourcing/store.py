#!/usr/bin/env python3
"""
SQLite store — dedupe + "new since last run" tracking.

The whole point of a sourcing business is being *first* to a car. That means the
store has to answer two questions cheaply:

  1. "Have I seen this listing before?"  (dedupe, so we don't re-alert)
  2. "Which of tonight's results are genuinely new / just dropped in price?"

We key on Listing.dedupe_key() (VIN when present, else source+id), stamp
first_seen / last_seen, and remember which (want, listing) pairs we've already
alerted on so a customer isn't emailed the same car twice.

Stdlib sqlite3, one file at data/sourcing/listings.db (gitignored).
"""
from __future__ import annotations

import json
import os
import sqlite3
from datetime import date
from typing import Optional

from .models import Listing

_DEFAULT_DB = os.path.join(
    os.path.dirname(__file__), "..", "data", "sourcing", "listings.db"
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS listings (
    key         TEXT PRIMARY KEY,
    source      TEXT,
    vin         TEXT,
    price       INTEGER,
    first_seen  TEXT,
    last_seen   TEXT,
    data        TEXT               -- full Listing as JSON
);
CREATE TABLE IF NOT EXISTS price_history (
    key   TEXT, seen TEXT, price INTEGER
);
CREATE TABLE IF NOT EXISTS alerts (
    want_id TEXT, key TEXT, alerted TEXT,
    PRIMARY KEY (want_id, key)
);
"""


class Store:
    def __init__(self, path: str = _DEFAULT_DB, today: Optional[str] = None):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self.db = sqlite3.connect(path)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(_SCHEMA)
        self.today = today or date.today().isoformat()

    def close(self):
        self.db.commit()
        self.db.close()

    # -- upsert ------------------------------------------------------------- #
    def upsert(self, lst: Listing) -> dict:
        """Insert or update a listing. Returns {'new': bool, 'price_drop': int|None}."""
        key = lst.dedupe_key()
        row = self.db.execute("SELECT price, first_seen FROM listings WHERE key=?",
                              (key,)).fetchone()
        is_new = row is None
        price_drop = None
        if is_new:
            lst.first_seen = self.today
        else:
            lst.first_seen = row["first_seen"]
            if lst.price and row["price"] and lst.price < row["price"]:
                price_drop = row["price"] - lst.price
        lst.last_seen = self.today
        self.db.execute(
            "INSERT INTO listings(key,source,vin,price,first_seen,last_seen,data) "
            "VALUES(?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET "
            "price=excluded.price,last_seen=excluded.last_seen,data=excluded.data",
            (key, lst.source, lst.vin, lst.price, lst.first_seen, lst.last_seen,
             json.dumps(lst.to_dict())),
        )
        self.db.execute("INSERT INTO price_history(key,seen,price) VALUES(?,?,?)",
                        (key, self.today, lst.price))
        return {"new": is_new, "price_drop": price_drop}

    # -- alert bookkeeping -------------------------------------------------- #
    def already_alerted(self, want_id: str, key: str) -> bool:
        return self.db.execute(
            "SELECT 1 FROM alerts WHERE want_id=? AND key=?", (want_id, key)
        ).fetchone() is not None

    def mark_alerted(self, want_id: str, key: str):
        self.db.execute(
            "INSERT OR REPLACE INTO alerts(want_id,key,alerted) VALUES(?,?,?)",
            (want_id, key, self.today),
        )

    def commit(self):
        self.db.commit()

    def stats(self) -> dict:
        c = self.db.execute("SELECT COUNT(*) n FROM listings").fetchone()["n"]
        new = self.db.execute("SELECT COUNT(*) n FROM listings WHERE first_seen=?",
                              (self.today,)).fetchone()["n"]
        return {"total": c, "new_today": new}
