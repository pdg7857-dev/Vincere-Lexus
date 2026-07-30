#!/usr/bin/env python3
"""Import iPhone contacts + iMessage/SMS threads from a local backup and link
them to CRM clients by phone number.

WHY A BACKUP (and not the phone / a web app):
  iOS sandboxes Messages and Contacts away from every third-party app and from
  the browser — there is no live API. The supported way to get this data onto a
  computer is a local **Finder / iTunes backup** of the iPhone, which contains:
    * Library/SMS/sms.db                    (iMessage + SMS)
    * Library/AddressBook/AddressBook.sqlitedb (Contacts)
  This script reads those out of a backup, matches each conversation to a CRM
  client by phone number, and writes crm/messages.js. The CRM loads that file
  and shows each client's real thread; re-run this after each backup to refresh.

HOW TO MAKE THE BACKUP (do this once on the salesperson's Mac/PC):
  1. Plug in the iPhone, open Finder (macOS Catalina+) or iTunes (Windows).
  2. Select the phone → "Back up all the data on your iPhone to this Mac".
     Leave "Encrypt local backup" OFF for the simplest path (or see --password).
  3. Back Up Now. The backup lands in (macOS):
       ~/Library/Application Support/MobileSync/Backup/<UDID>/
     (Windows: %APPDATA%\\Apple\\MobileSync\\Backup\\<UDID>\\)

USAGE:
  python3 scripts/import_iphone_backup.py                    # newest backup, auto
  python3 scripts/import_iphone_backup.py /path/to/Backup/<UDID>
  python3 scripts/import_iphone_backup.py <backup> --password 'BACKUP_PASSWORD'
  python3 scripts/import_iphone_backup.py --clients crm/data.js   # phone source

Encrypted backups need the backup password and the optional dependency
`iphone_backup_decrypt` (pip install iphone_backup_decrypt). Unencrypted backups
need nothing beyond the Python standard library.
"""
import argparse
import json
import os
import plistlib
import re
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APPLE_EPOCH_OFFSET = 978307200  # seconds between 1970-01-01 and 2001-01-01

SMS_RELPATH = "Library/SMS/sms.db"
AB_RELPATH = "Library/AddressBook/AddressBook.sqlitedb"


def default_backup_dir():
    home = Path.home()
    candidates = [
        home / "Library/Application Support/MobileSync/Backup",           # macOS
        Path(os.environ.get("APPDATA", "")) / "Apple/MobileSync/Backup",  # Win (new)
        Path(os.environ.get("APPDATA", "")) / "Apple Computer/MobileSync/Backup",
    ]
    for base in candidates:
        if base.is_dir():
            subs = [p for p in base.iterdir() if p.is_dir()]
            if subs:
                return max(subs, key=lambda p: p.stat().st_mtime)
    return None


def norm_phone(raw):
    """Last-10-digits key so +1 (416) 555-0100 == 4165550100 == 416-555-0100."""
    if not raw:
        return ""
    digits = re.sub(r"[^0-9]", "", str(raw))
    if len(digits) > 10:
        digits = digits[-10:]
    return digits


def file_in_backup(backup, domain, relpath):
    """Resolve a logical file (domain, relativePath) to its on-disk blob.
    Modern backups store a Manifest.db mapping; the blob lives in
    <backup>/<first 2 hex of fileID>/<fileID>."""
    manifest = backup / "Manifest.db"
    if manifest.exists():
        con = sqlite3.connect(str(manifest))
        try:
            row = con.execute(
                "SELECT fileID FROM Files WHERE domain=? AND relativePath=?",
                (domain, relpath)).fetchone()
        finally:
            con.close()
        if row:
            fid = row[0]
            p = backup / fid[:2] / fid
            if p.exists():
                return p
    # very old backups: flat file named by SHA1(domain-relpath)
    import hashlib
    fid = hashlib.sha1(("%s-%s" % (domain, relpath)).encode()).hexdigest()
    p = backup / fid
    return p if p.exists() else None


def is_encrypted(backup):
    mp = backup / "Manifest.plist"
    if not mp.exists():
        return False
    with open(mp, "rb") as fh:
        return bool(plistlib.load(fh).get("IsEncrypted"))


def open_sqlite_copy(src, tmpdir):
    """Copy the db (and -wal/-shm if present) so we read a stable snapshot."""
    dst = Path(tmpdir) / (Path(src).name + ".db")
    shutil.copy(src, dst)
    return sqlite3.connect(str(dst))


# --------------------------------------------------------------------------- #
def read_contacts(ab_path, tmpdir):
    """name -> {phones:set, emails:set} from AddressBook.sqlitedb."""
    con = open_sqlite_copy(ab_path, tmpdir)
    con.row_factory = sqlite3.Row
    out = {}
    # ABMultiValue.value holds each phone/email; we classify by content (has '@'),
    # so the label tables aren't needed.
    rows = con.execute("""
        SELECT p.ROWID as pid, p.First as first, p.Last as last,
               p.Organization as org, v.value as value
        FROM ABPerson p LEFT JOIN ABMultiValue v ON v.record_id = p.ROWID
    """).fetchall()
    people = {}
    for r in rows:
        nm = (" ".join(x for x in [r["first"], r["last"]] if x)).strip() or (r["org"] or "")
        rec = people.setdefault(r["pid"], {"name": nm, "phones": set(), "emails": set()})
        val = r["value"]
        if not val:
            continue
        if "@" in str(val):
            rec["emails"].add(str(val).strip().lower())
        elif re.search(r"\d", str(val)):
            rec["phones"].add(norm_phone(val))
    con.close()
    for rec in people.values():
        if rec["name"]:
            out[rec["name"]] = {"phones": rec["phones"], "emails": rec["emails"]}
    # index by phone/email for quick lookup
    by_phone, by_email = {}, {}
    for name, rec in out.items():
        for ph in rec["phones"]:
            by_phone[ph] = name
        for em in rec["emails"]:
            by_email[em] = name
    return out, by_phone, by_email


def read_messages(sms_path, tmpdir):
    """thread-key -> [ {from:'me'|'them', text, ts(iso)} ] from sms.db.

    Keys off the CHAT (chat_message_join -> chat.chat_identifier) rather than the
    message's handle_id. Outgoing messages (is_from_me=1) and group messages often
    have handle_id=0, so an inner join on `handle` silently drops them and you get
    one-sided threads — keying on the chat captures both directions.

    Note: on modern iOS many messages store their body in `attributedBody` (a
    binary blob) with `text` NULL; those are skipped here (decoding the
    NSAttributedString stream is out of scope). Screenshot import via Claude is the
    higher-fidelity path.
    """
    import datetime as _dt
    con = open_sqlite_copy(sms_path, tmpdir)
    con.row_factory = sqlite3.Row

    def to_ts(raw):
        raw = raw or 0
        secs = raw / 1e9 if raw > 1e11 else raw  # ns (modern) vs s (legacy)
        try:                                     # local time of the machine importing
            return _dt.datetime.fromtimestamp(secs + APPLE_EPOCH_OFFSET).isoformat(timespec="minutes")
        except (OverflowError, OSError, ValueError):
            return None

    chat_q = """
        SELECT c.chat_identifier AS ident, m.is_from_me AS mine, m.text AS text, m.date AS mdate
        FROM message m
        JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
        JOIN chat c ON c.ROWID = cmj.chat_id
        WHERE m.text IS NOT NULL AND m.text <> ''
        ORDER BY m.date ASC
    """
    fallback_q = """
        SELECT h.id AS ident, m.is_from_me AS mine, m.text AS text, m.date AS mdate
        FROM message m LEFT JOIN handle h ON m.handle_id = h.ROWID
        WHERE m.text IS NOT NULL AND m.text <> ''
        ORDER BY m.date ASC
    """
    try:
        cur = con.execute(chat_q)
    except sqlite3.Error:
        cur = con.execute(fallback_q)

    threads = {}
    for r in cur:
        ident = str(r["ident"] or "")
        if not ident or ident.startswith("chat"):   # skip group chats (no single client)
            continue
        key = norm_phone(ident) if re.search(r"\d", ident) else ident.lower()
        if not key:
            continue
        threads.setdefault(key, []).append({
            "from": "me" if r["mine"] else "them",
            "text": r["text"],
            "ts": to_ts(r["mdate"]),
        })
    con.close()
    return threads


# --------------------------------------------------------------------------- #
def load_client_phones(clients_js):
    """Read crm/data.js -> [{dealId, name, phoneKey, emailKey}] for matching."""
    txt = Path(clients_js).read_text(encoding="utf-8")
    data = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
    out = []
    for d in data.get("deals", []):
        out.append({"dealId": d["id"], "name": d["name"],
                    "phoneKey": norm_phone(d.get("phone")),
                    "emailKey": (d.get("email") or "").strip().lower()})
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("backup", nargs="?", help="path to the backup folder (…/Backup/<UDID>)")
    ap.add_argument("--password", help="backup password (only for encrypted backups)")
    ap.add_argument("--clients", default=str(ROOT / "crm" / "data.js"),
                    help="crm/data.js to match phone numbers against")
    ap.add_argument("--out", default=str(ROOT / "crm" / "messages.js"))
    args = ap.parse_args()

    backup = Path(args.backup) if args.backup else default_backup_dir()
    if not backup or not backup.is_dir():
        sys.exit("No backup folder found. Make an unencrypted Finder/iTunes backup "
                 "first, then pass its path (…/MobileSync/Backup/<UDID>).")
    print("Backup:", backup)

    if is_encrypted(backup):
        if not args.password:
            sys.exit("This backup is ENCRYPTED. Re-run with --password 'YOUR_BACKUP_PASSWORD'.\n"
                     "You may also need:  pip install iphone_backup_decrypt")
        try:
            from iphone_backup_decrypt import EncryptedBackup, RelativePath
        except ImportError:
            sys.exit("Encrypted backup needs the decrypt helper:\n"
                     "  pip install iphone_backup_decrypt")
        tmp = tempfile.mkdtemp()
        eb = EncryptedBackup(backup_directory=str(backup), passphrase=args.password)
        sms_path = Path(tmp) / "sms.db"
        ab_path = Path(tmp) / "AddressBook.sqlitedb"
        eb.extract_file(relative_path=RelativePath.SMS_DB, output_filename=str(sms_path))
        eb.extract_file(relative_path="Library/AddressBook/AddressBook.sqlitedb",
                        output_filename=str(ab_path))
    else:
        tmp = tempfile.mkdtemp()
        sms_path = file_in_backup(backup, "HomeDomain", SMS_RELPATH)
        ab_path = file_in_backup(backup, "HomeDomain", AB_RELPATH)
        if not sms_path:
            sys.exit("Couldn't find sms.db in the backup (is Messages included?).")

    contacts, by_phone, by_email = ({}, {}, {})
    if ab_path:
        contacts, by_phone, by_email = read_contacts(ab_path, tmp)
        print("Contacts read:", len(contacts))
    threads = read_messages(sms_path, tmp)
    print("Conversation threads in backup:", len(threads))

    clients = load_client_phones(args.clients)
    by_deal, matched_contacts, matched = {}, {}, 0
    for c in clients:
        thread = threads.get(c["phoneKey"]) or threads.get(c["emailKey"])
        cname = by_phone.get(c["phoneKey"]) or by_email.get(c["emailKey"])
        if thread:
            by_deal[str(c["dealId"])] = {"sample": False, "messages": thread,
                                         "contactName": cname or c["name"]}
            matched += 1
        if cname:
            rec = contacts.get(cname, {})
            matched_contacts[str(c["dealId"])] = {
                "name": cname,
                "phones": sorted(rec.get("phones", [])),
                "emails": sorted(rec.get("emails", [])),
            }
    print("Clients matched to a conversation:", matched, "of", len(clients))

    import datetime as _dt
    payload = {"source": "iphone-backup", "byDealId": by_deal, "contacts": matched_contacts}
    out = Path(args.out)
    out.write_text("// Generated by scripts/import_iphone_backup.py — real iMessage/SMS threads.\n"
                   "window.CRM_MESSAGES = " + json.dumps(payload, ensure_ascii=False) + ";\n",
                   encoding="utf-8")
    print("Wrote", out)
    if matched == 0:
        print("\nNo threads matched. Check that client phone numbers in the CRM match the "
              "numbers in Messages (this tool matches on the last 10 digits).")


if __name__ == "__main__":
    main()
