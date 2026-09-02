# Northwest Lexus inventory watch

A daily job that watches **northwestlexus.com**, detects **newly-added vehicles**,
and for each one:

1. **downloads its photos** to Google Drive (a dedicated "New arrivals (auto)" tree),
2. **generates 3 Facebook Marketplace copy variants** — same facts, different
   wording, OMVIC-safe (nothing added, dropped, softened, or invented),
3. **notifies you** (Slack and/or email) so you have a constant posting stream.

It runs as a **GitHub Actions cron** (`.github/workflows/inventory-watch.yml`) so it
has real internet access — this project's Claude environment blocks the dealer
site, which is also why the separate dealer sync runs outside it.

## How it works

`watch.py` → scan (`dealer.py`, sitemap → schema.org JSON-LD) → diff against
`state/known_stock.json` → for each new stock #: `copy.py` (Marketplace copy) +
`drive.py` (photo upload) → `notify.py` → commit the updated state back to the repo.

The state file is **seeded** with the stock numbers already in inventory, so the
first real run only flags *genuinely new* arrivals — not the whole lot.

## ⚠️ Cloudflare / where it runs

`northwestlexus.com` is behind a Cloudflare WAF that frequently returns **HTTP 403
to datacentre IPs — including GitHub-hosted runners.** If the scheduled run fails
with `BLOCKED`, switch this job to a **self-hosted runner** on a normal
network/residential IP (e.g. a small always-on box at the dealership or your home):

```yaml
# in inventory-watch.yml
jobs:
  watch:
    runs-on: [self-hosted]   # instead of ubuntu-latest
```

(Set up a self-hosted runner: repo → Settings → Actions → Runners → New runner.)
That is the reliable long-term home for this job. Test first with a manual
**Run workflow → dry run** to see whether the hosted runner is challenged.

## Configuration

Everything is optional and degrades gracefully — with **no** secrets set, the job
still scans, diffs, and writes the Marketplace copy to the run's summary/artifact.

Set these under **repo → Settings → Secrets and variables → Actions**.

### Secrets (sensitive)
| Name | Purpose |
|------|---------|
| `GDRIVE_SERVICE_ACCOUNT_JSON` | Google service-account key JSON (the account that can write to your Lexus Photos Drive — reuse or share the folder with your existing sync service account). Enables photo upload. |
| `ANTHROPIC_API_KEY` | Enables Claude-written Marketplace copy. Without it, a deterministic template is used. |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook for new-car alerts. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Email alerts (e.g. Gmail app password). |

### Variables (non-sensitive)
| Name | Example |
|------|---------|
| `GDRIVE_ROOT_FOLDER_ID` | the "Lexus Photos" root folder id (parent for uploads) |
| `GDRIVE_SUBDIR` | `New arrivals (auto)` (default) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` (default) |
| `FB_PRICE_DISCLOSURE` | **Your** OMVIC-correct all-in price line. **You are responsible for this being compliant.** |
| `FB_CONTACT_LINE` | e.g. `I'm Phil's assistant — text Phil directly to confirm.` |
| `SMTP_PORT`, `NOTIFY_EMAIL_TO`, `NOTIFY_EMAIL_FROM` | email routing |

## Run it manually

- **GitHub UI:** Actions → *Northwest Lexus inventory watch* → **Run workflow**
  (toggle **dry run** to preview without uploading/notifying/committing).
- **Locally / self-hosted:**
  ```bash
  pip install -r automation/inventory_watch/requirements.txt
  python3 automation/inventory_watch/watch.py --dry-run --limit 15
  ```

## OMVIC compliance

The copy generator locks the vehicle's facts and forbids the model from changing
them; every variant is validated to still contain the price, kilometres, and
stock number. **You must set `FB_PRICE_DISCLOSURE` to your dealership's correct
all-in advertised-price wording** — the default is a placeholder, not legal advice.

## ⚠️ Security note (existing repo)

The repo file `fb-photos` currently contains a Google OAuth **client secret**
(`GOCSPX-…`) in plaintext. Even in a private repo that shouldn't be committed:
**rotate that secret** in Google Cloud and remove the file from the repo (and
history). This new system keeps all credentials in **GitHub Secrets**, never in
files.
