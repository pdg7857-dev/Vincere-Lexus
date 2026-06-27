# Vincere — local Lexus CRM (single-user, offline)

A Salesforce-style CRM that runs **entirely on your computer**. No install, no server, no cloud
account. Your data is stored locally in your browser and you back it up to Google Drive whenever you
like (the app reminds you weekly).

## Run it

**Easiest:** double-click `index.html`. It opens in your default browser and just works (data persists
between sessions).

**If your browser blocks local storage on `file://`** (rare — mainly Safari), run a tiny local server
from this folder instead and open the URL it prints:

```
# Python (already on most machines)
python3 -m http.server 8765
#  → open http://localhost:8765
```

Add it to your bookmarks / home screen for one-tap access.

## What's inside

- **Dashboard** — counts, hot clients with in‑budget matches, tasks & reposts due today, aging units.
- **Clients** — searchable list + a full record page: profile, an **Activity timeline** (log notes,
  calls, emails, meetings — full history), matched vehicles, and follow‑up tasks.
- **Inventory** — new (Inventory/Pipeline/Delivery) and used vehicles; add/edit inline.
- **Matches / Upsell** — auto-computed from your clients + inventory + 2026 pricing.
- **Tasks** — follow-ups and Facebook Marketplace repost reminders, with due dates.
- **Settings** — import (CSV/JSON), **export backup**, restore, and editable rules (repost interval,
  series ladder, used-availability).

## Backups (do this weekly)

1. **Settings → Export backup** → saves `vincere-crm-backup-YYYY-MM-DD.json`.
2. Drop that file in your Google Drive backup folder (or let Google Drive for Desktop sync it).
3. To move data to another device (e.g. your phone): open the app there → **Settings → Restore** →
   pick the latest backup file.

> Single-user by design. Because data is local to each device, your phone and desktop don't auto-sync —
> the backup file is how you carry data between them. (If you later want live phone↔desktop sync, that
> needs a hosted database; ask and we'll add it.)

## Your data is yours

Everything lives in this browser's local storage on this device. Clearing your browser data, or
"Settings → Clear all data," erases it — so keep your weekly backup. Nothing is ever sent anywhere.
