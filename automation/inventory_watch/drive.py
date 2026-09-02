#!/usr/bin/env python3
"""
Upload a new car's photos to Google Drive.

Auth: a Google service account with write access to the target Drive folder.
Provide the key JSON via env GDRIVE_SERVICE_ACCOUNT_JSON (the JSON string) or
GDRIVE_SERVICE_ACCOUNT_FILE (a path). The existing dealer sync already uses a
service account with access to the Lexus Photos tree — reuse (or share the
target folder with) that account.

Layout (kept separate from the dealer sync's own folder naming so the two never
collide): <root>/<GDRIVE_SUBDIR>/<stock> <year> <model> <trim>/NN.jpg
Set GDRIVE_ROOT_FOLDER_ID to the parent (e.g. the "Lexus Photos" root, or any
folder you like). GDRIVE_SUBDIR defaults to "New arrivals (auto)".

Idempotent: a car whose folder already holds images is skipped.

This module is OPTIONAL. If no service-account creds are set, upload_photos()
returns a "skipped" result and the pipeline still scans + notifies.
"""
from __future__ import annotations

import io
import json
import os
import re
import urllib.request

ROOT_ID = os.environ.get("GDRIVE_ROOT_FOLDER_ID", "")
SUBDIR = os.environ.get("GDRIVE_SUBDIR", "New arrivals (auto)")
MAX_PHOTOS = int(os.environ.get("GDRIVE_MAX_PHOTOS", "40"))


def _creds():
    raw = os.environ.get("GDRIVE_SERVICE_ACCOUNT_JSON")
    path = os.environ.get("GDRIVE_SERVICE_ACCOUNT_FILE")
    info = None
    if raw:
        info = json.loads(raw)
    elif path and os.path.exists(path):
        info = json.load(open(path))
    if not info:
        return None
    from google.oauth2 import service_account  # lazy import

    return service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/drive"]
    )


def _safe(name: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[\\/]+", "-", name)).strip()[:120]


def _download(url: str, timeout: int = 60) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except Exception:  # noqa: BLE001
        return None


class _Drive:
    def __init__(self, creds):
        from googleapiclient.discovery import build  # lazy import

        self.svc = build("drive", "v3", credentials=creds, cache_discovery=False)

    def _find(self, name: str, parent: str) -> str | None:
        q = (
            f"name = '{name.replace(chr(39), chr(92) + chr(39))}' and "
            f"'{parent}' in parents and trashed = false and "
            "mimeType = 'application/vnd.google-apps.folder'"
        )
        res = self.svc.files().list(q=q, fields="files(id)", pageSize=1).execute()
        files = res.get("files", [])
        return files[0]["id"] if files else None

    def ensure_folder(self, name: str, parent: str) -> str:
        found = self._find(name, parent)
        if found:
            return found
        meta = {"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent]}
        return self.svc.files().create(body=meta, fields="id").execute()["id"]

    def count_images(self, folder: str) -> int:
        q = f"'{folder}' in parents and trashed = false and mimeType contains 'image/'"
        res = self.svc.files().list(q=q, fields="files(id)", pageSize=1000).execute()
        return len(res.get("files", []))

    def upload_image(self, name: str, data: bytes, parent: str) -> None:
        from googleapiclient.http import MediaIoBaseUpload  # lazy import

        media = MediaIoBaseUpload(io.BytesIO(data), mimetype="image/jpeg", resumable=False)
        self.svc.files().create(
            body={"name": name, "parents": [parent]}, media_body=media, fields="id"
        ).execute()


def upload_photos(unit: dict) -> dict:
    """Upload a unit's photos. Returns {status, folder_id?, uploaded, reason?}."""
    creds = _creds()
    if not creds or not ROOT_ID:
        return {"status": "skipped", "reason": "no GDRIVE creds / GDRIVE_ROOT_FOLDER_ID", "uploaded": 0}
    images = (unit.get("images") or [])[:MAX_PHOTOS]
    if not images:
        return {"status": "skipped", "reason": "no photos found on listing", "uploaded": 0}
    try:
        drive = _Drive(creds)
        sub = drive.ensure_folder(SUBDIR, ROOT_ID)
        make = str(unit.get("brand", "Lexus") or "").strip()
        model = str(unit.get("model", "") or "").strip()
        make_part = "" if (not make or model.lower().startswith(make.lower())) else make
        desc = _safe(
            f"{unit.get('stock','')} {unit.get('year','')} {make_part} "
            f"{model} {unit.get('trim','')}"
        )
        car = drive.ensure_folder(desc, sub)
        if drive.count_images(car) > 0:
            return {"status": "exists", "folder_id": car, "uploaded": 0}
        n = 0
        for idx, url in enumerate(images, 1):
            data = _download(url)
            if not data:
                continue
            drive.upload_image(f"{idx:02d}.jpg", data, car)
            n += 1
        return {"status": "ok", "folder_id": car, "uploaded": n}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "reason": str(e), "uploaded": 0}
