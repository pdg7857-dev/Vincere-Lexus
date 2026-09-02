#!/usr/bin/env python3
"""
Notify Phil about new arrivals.

Channels (all optional, all stdlib):
  * Slack   — set SLACK_WEBHOOK_URL (an Incoming Webhook).
  * Email   — set SMTP_HOST, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL_TO
              (and optional SMTP_PORT [587], NOTIFY_EMAIL_FROM).
Always returns the Markdown body so the caller can also write it to the GitHub
Actions job summary / an artifact.
"""
from __future__ import annotations

import json
import os
import smtplib
import urllib.request
from email.mime.text import MIMEText


def build_markdown(new_cars: list[dict]) -> str:
    if not new_cars:
        return "No new vehicles on northwestlexus.com today."
    lines = [f"## 🚗 {len(new_cars)} new vehicle(s) added to Northwest Lexus", ""]
    for c in new_cars:
        unit = c["unit"]
        copy = c["copy"]
        drive = c.get("drive", {})
        photos = drive.get("uploaded", 0)
        title = copy["title"] or unit.get("stock", "")
        price = f"${unit['price']:,}" if isinstance(unit.get("price"), int) else "price on request"
        km = f"{unit['odometer']:,} km" if isinstance(unit.get("odometer"), int) else ""
        lines.append(f"### {title} — {price}")
        meta = " · ".join(x for x in [unit.get("condition"), km, unit.get("exterior"), f"stock #{unit.get('stock')}"] if x)
        lines.append(f"*{meta}*")
        if unit.get("url"):
            url = unit["url"]
            lines.append(f"[Listing]({url if url.startswith('http') else 'https://www.northwestlexus.com' + url})")
        if drive.get("status") in ("ok", "exists"):
            lines.append(f"Photos in Drive: {photos} uploaded ({drive.get('status')})")
        lines.append("")
        lines.append(f"**Marketplace copy ({copy['source']}):**")
        for i, v in enumerate(copy["variants"], 1):
            lines.append(f"{i}. {v}")
        lines.append("")
    return "\n".join(lines)


def _slack(md: str) -> bool:
    url = os.environ.get("SLACK_WEBHOOK_URL")
    if not url:
        return False
    try:
        body = json.dumps({"text": md}).encode()
        req = urllib.request.Request(url, data=body, headers={"content-type": "application/json"})
        urllib.request.urlopen(req, timeout=30).read()
        return True
    except Exception as e:  # noqa: BLE001
        print(f"  notify: slack failed ({e})", flush=True)
        return False


def _email(md: str, subject: str) -> bool:
    host = os.environ.get("SMTP_HOST")
    to = os.environ.get("NOTIFY_EMAIL_TO")
    if not host or not to:
        return False
    user = os.environ.get("SMTP_USER", "")
    pw = os.environ.get("SMTP_PASS", "")
    port = int(os.environ.get("SMTP_PORT", "587"))
    frm = os.environ.get("NOTIFY_EMAIL_FROM", user or to)
    try:
        msg = MIMEText(md, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = frm
        msg["To"] = to
        with smtplib.SMTP(host, port, timeout=30) as s:
            s.starttls()
            if user:
                s.login(user, pw)
            s.sendmail(frm, [a.strip() for a in to.split(",")], msg.as_string())
        return True
    except Exception as e:  # noqa: BLE001
        print(f"  notify: email failed ({e})", flush=True)
        return False


def notify(new_cars: list[dict]) -> str:
    md = build_markdown(new_cars)
    if new_cars:
        subject = f"{len(new_cars)} new Lexus arrival(s) — post to Marketplace"
        _slack(md)
        _email(md, subject)
    return md
