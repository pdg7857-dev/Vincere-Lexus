# Vincere CRM — Windows Setup Checklist

A one-page checklist to get **Vincere CRM** running on your Windows PC. Do the
one-time setup once; then repeat the daily loop each morning.

---

## 0. One-time prerequisites (install these first)

| Tool | Why | Install |
|---|---|---|
| **Python 3.11+** | runs the app + ingestion | https://www.python.org/downloads/windows/ — during install **tick "Add python.exe to PATH"** |
| **Git** (optional) | version the project | https://git-scm.com/download/win |
| **iTunes** | makes the encrypted iPhone backup | Microsoft Store or apple.com/itunes |
| **Node.js LTS** | required by Claude Code | https://nodejs.org |
| **Claude Code** | the AI engine (runs on your subscription) | `npm install -g @anthropic-ai/claude-code` |

Verify each in **PowerShell**:
```powershell
python --version        # 3.11 or higher
node --version
claude --version
```

---

## 1. Log Claude Code into your subscription (makes AI key-free)

```powershell
claude            # opens a browser once; log in with your Pro/Max account, then close it
# optional, so the app never needs a browser again:
claude setup-token
```
If you run `setup-token`, copy the token it prints — the app's `.env` can hold it as
`CLAUDE_CODE_OAUTH_TOKEN`.

> This is what lets summaries run on your **subscription instead of an API key**.
> Note: summary calls share your normal Claude Code usage limits (fine for a handful
> of accounts a day).

---

## 2. Make your first encrypted iPhone backup

1. Plug the iPhone into the PC, open **iTunes** → select the device.
2. Under **Backups**, choose **This computer**.
3. **Tick "Encrypt local backup"**, set a password you'll remember, click **Back Up Now**.
   - Encryption is required — it's the only way WhatsApp + full message history are
     included.
4. Note where it lands (the app auto-detects both, but good to know):
   - Microsoft Store iTunes: `%USERPROFILE%\Apple\MobileSync\Backup\`
   - Classic iTunes: `%APPDATA%\Apple Computer\MobileSync\Backup\`

---

## 3. Build the app

1. Make an empty folder, e.g. `C:\Users\<you>\vincere-crm`.
2. Open **Claude Code** in that folder:
   ```powershell
   cd C:\Users\<you>\vincere-crm
   claude
   ```
3. Paste the full build prompt (`CRM_BUILD_PROMPT.md`) and let it build phase by phase.
   Verify each phase before moving on.

---

## 4. Run it

From the project folder (after Claude Code has built it):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m vincere_crm
```
Then open **http://127.0.0.1:8100** in your browser.

> If PowerShell blocks the activate script, run once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## 5. The daily loop (every morning, ~2 min)

1. Plug in the iPhone → iTunes → **Back Up Now** (encrypted).
2. Open the app → **Import** → confirm/point at the backup path → enter the backup
   password → **Run import**. (Only new messages/calls are pulled in.)
3. Open **Today** → triage anything in the **Inbox** (tag unknown numbers to a business
   once) → click **Summarize updated accounts**.
4. Work your **Pipelines** — each account has a fresh AI summary, suggested stage, and
   next action.

---

## Privacy recap

- All data stays in a local SQLite file on this PC. Nothing is uploaded.
- The only thing that ever leaves your machine is the single conversation you're
  summarizing (sent to Claude via your subscription) — never the whole database.
- The backup, database, and any credentials are git-ignored; keep them off any repo.

---

## Quick troubleshooting

| Symptom | Fix |
|---|---|
| `claude` not found | reopen PowerShell after install; confirm Node is on PATH |
| App can't read backup folder | run the terminal/app as your normal user; confirm the backup path exists and isn't OneDrive-redirected |
| "wrong password" on import | it's the **backup encryption** password (set in iTunes), not your Apple ID password |
| No WhatsApp data | the backup wasn't encrypted — remake it with "Encrypt local backup" ticked |
| Summaries fail | run `claude -p "hi"` in PowerShell to confirm Claude Code is logged in and within usage limits |
