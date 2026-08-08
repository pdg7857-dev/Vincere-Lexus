#!/usr/bin/env python3
"""
Alerting — turn matches into something you'll actually act on.

Notifiers are pluggable, same idea as the data adapters:

  ConsoleNotifier  — prints a readable digest (default; always works)
  JsonNotifier     — writes data/sourcing/matches.json for the app / other tools
  EmailNotifier    — SMTP digest, configured entirely from env vars (opt-in)

`send_digest` groups matches by customer and skips any (want, listing) pair the
store has already alerted on, so nobody gets pinged about the same car twice.
"""
from __future__ import annotations

import json
import os
import smtplib
from email.mime.text import MIMEText
from typing import Optional

from .models import Match
from .store import Store


def _line(m: Match) -> str:
    l = m.listing
    price = f"${l.price:,}" if l.price else "price n/a"
    km = f"{l.odometer:,} km" if l.odometer is not None else "km n/a"
    loc = ", ".join(p for p in [l.city, l.province] if p)
    return (f"  [{m.score:>4.0f}] {l.year or '?'} {l.make} {l.model} {l.trim} — "
            f"{price} · {km} · {l.condition} · {loc} ({l.seller_type})\n"
            f"         {l.url}\n"
            f"         why: {'; '.join(m.reasons) or 'matches criteria'}")


def _group(matches: list[Match]) -> dict[str, list[Match]]:
    by: dict[str, list[Match]] = {}
    for m in matches:
        by.setdefault(m.want.customer or m.want.id or "(unassigned)", []).append(m)
    return by


class ConsoleNotifier:
    def send(self, matches: list[Match]) -> None:
        if not matches:
            print("No new matches.")
            return
        for customer, ms in _group(matches).items():
            print(f"\n=== {customer} — {len(ms)} new match(es) ===")
            for m in ms:
                print(_line(m))


class JsonNotifier:
    def __init__(self, path: Optional[str] = None):
        self.path = path or os.path.join(
            os.path.dirname(__file__), "..", "data", "sourcing", "matches.json")

    def send(self, matches: list[Match]) -> None:
        os.makedirs(os.path.dirname(os.path.abspath(self.path)), exist_ok=True)
        with open(self.path, "w") as f:
            json.dump([m.to_dict() for m in matches], f, indent=2)
        print(f"Wrote {len(matches)} match(es) -> {self.path}")


class EmailNotifier:
    """SMTP digest. Configure via env; a missing var disables it gracefully.
        SOURCING_SMTP_HOST, SOURCING_SMTP_PORT (default 587),
        SOURCING_SMTP_USER, SOURCING_SMTP_PASS,
        SOURCING_MAIL_FROM, SOURCING_MAIL_TO (comma-separated)
    """
    def _cfg(self):
        return {
            "host": os.environ.get("SOURCING_SMTP_HOST", ""),
            "port": int(os.environ.get("SOURCING_SMTP_PORT", "587")),
            "user": os.environ.get("SOURCING_SMTP_USER", ""),
            "pw":   os.environ.get("SOURCING_SMTP_PASS", ""),
            "frm":  os.environ.get("SOURCING_MAIL_FROM", ""),
            "to":   [x.strip() for x in os.environ.get("SOURCING_MAIL_TO", "").split(",") if x.strip()],
        }

    def send(self, matches: list[Match]) -> None:
        c = self._cfg()
        if not (c["host"] and c["frm"] and c["to"]):
            print("EmailNotifier: SMTP env not set — skipping email digest.")
            return
        if not matches:
            return
        body = ["New car matches for your customers:\n"]
        for customer, ms in _group(matches).items():
            body.append(f"\n=== {customer} — {len(ms)} match(es) ===")
            body += [_line(m) for m in ms]
        msg = MIMEText("\n".join(body))
        msg["Subject"] = f"[Sourcing] {len(matches)} new car match(es)"
        msg["From"] = c["frm"]
        msg["To"] = ", ".join(c["to"])
        try:
            with smtplib.SMTP(c["host"], c["port"], timeout=30) as s:
                s.starttls()
                if c["user"]:
                    s.login(c["user"], c["pw"])
                s.sendmail(c["frm"], c["to"], msg.as_string())
            print(f"EmailNotifier: sent digest to {', '.join(c['to'])}")
        except Exception as e:  # noqa: BLE001
            print(f"EmailNotifier: failed to send ({e})")


def send_digest(matches: list[Match], store: Store, notifiers: list) -> list[Match]:
    """Filter out already-alerted pairs, dispatch to all notifiers, and record
    what we sent. Returns the list of genuinely-new matches."""
    fresh = []
    for m in matches:
        key = m.listing.dedupe_key()
        if store.already_alerted(m.want.id, key):
            continue
        fresh.append(m)
    for n in notifiers:
        n.send(fresh)
    for m in fresh:
        store.mark_alerted(m.want.id, m.listing.dedupe_key())
    store.commit()
    return fresh
