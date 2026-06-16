# Marketplace Auto-Lister 🚗

Post car listings to **Facebook Marketplace** from **your own signed-in browser** —
no Facebook API, no bot account, no scraping of other people's data. You drop in
photos, fill the blanks in a quick form, and the app:

1. Builds a caption that **always follows the same locked format** (fill-in-the-blanks).
2. Drives a real Chromium window (logged into *your* account) to fill the Marketplace
   "Vehicle for sale" form, attach your photos, and publish.
3. Every **10 days**, automatically **deletes** the listing and **re-posts** a fresh
   copy so it climbs back to the top — **without archiving your Messenger chats**
   (deleting a listing doesn't touch Messenger; your conversations stay put).

It is *not* a bot in the API sense — it's automation of the browser you already use,
the same clicks you'd do by hand.

---

## How it works (architecture)

- **Node + Playwright** launches Chromium with a **persistent profile** on disk
  (`data/browser-profile/`). You log into Facebook **once, by hand** (2FA included)
  and the session sticks — every later post/delete reuses it.
- A small **local web dashboard** (http://localhost:4545) is where you create
  listings, upload photos, preview the caption, and hit Publish / Relist.
- A **built-in scheduler** checks hourly and relists anything past the 10-day mark.
- Listing data + photos are stored locally (`data/listings.json`, `data/uploads/`)
  so a relist can re-upload the exact same images and caption.

Nothing leaves your machine except the listings you publish to your own account.

---

## Setup

Requires Node 18+ (tested on Node 22).

```bash
cd marketplace
npm install              # installs deps + downloads the Chromium Playwright uses
```

> If `npm install` skipped the browser download (offline/CI), run it manually:
> `npx playwright install chromium`

### 1. Log into Facebook once

```bash
npm run login
```

A Chromium window opens. Log into **your** Facebook account (handle any 2FA /
checkpoints), leave it on the home feed, then press **Enter** in the terminal.
Your session is saved to the profile and reused from now on.

### 2. Start the app

```bash
npm start
```

Open **http://localhost:4545**.

---

## Using it

1. **Fill the form** — year, make, model, price, mileage, body style, colors, etc.
   The **caption preview** updates live as you type.
2. **Add photos** — drag your car photos into the file picker (up to 20).
3. **Save**.
4. **🧪 Fill form (don't publish)** — opens Marketplace and fills everything but
   stops *before* publishing, so you can eyeball it the first few times.
5. **🚀 Publish now** — fills and publishes for real. Watch the browser window do it.
6. Each saved listing shows its **age** and when it's **due for relist**. The
   scheduler handles relisting automatically, or hit **🔁 Relist now** any time.

### The caption format

Every listing uses the exact template in **`templates/caption.txt`**. Edit that file
to change the wording for *all* listings — anything in `{curly_braces}` is a blank the
form fills in. Available blanks:

```
{year} {make} {model} {trim} {price} {mileage} {fuel_type} {transmission}
{drivetrain} {exterior_color} {interior_color} {title_status} {condition}
{features} {description} {location} {negotiable_tag} {listed_date}
```

### Settings — `config.json`

| Key | Meaning |
|---|---|
| `relistEveryDays` | Days before auto delete + relist (default **10**). |
| `schedulerCheckMinutes` | How often the scheduler checks (default 60). |
| `port` | Dashboard port (default 4545). |
| `browser.headless` | Keep **false** — Facebook trusts a visible window far more. |
| `browser.userDataDir` | Where the logged-in profile lives. |
| `facebook.labels.*` | The on-screen field labels Playwright looks for. **Translate these if your Facebook UI is not in English.** |
| `defaults.location` | Pre-fills the location blank. |

---

## Relisting from cron instead (optional)

If you'd rather not keep the app running, trigger relists on a schedule:

```bash
npm run relist-now      # relists everything currently past the window, then exits
```

Wire that into cron (macOS/Linux) or Task Scheduler (Windows). Example — hourly:

```
0 * * * * cd /full/path/to/marketplace && /usr/local/bin/npm run relist-now >> relist.log 2>&1
```

---

## Important notes & limits

- **Facebook changes its HTML constantly** and has no stable field IDs, so the form
  automation is *best-effort*. If a field stops filling, the fix is usually a label in
  `config.json → facebook.labels`. The app screenshots each post/delete to
  `data/screenshots/` so you can see exactly where it was when something looked off.
- The poster **warns** (doesn't crash) on a field it can't find, so one renamed field
  won't sink the whole listing — but always review the first few posts.
- **Keep `headless: false`.** Facebook challenges headless sessions much more.
- **Don't over-do relisting.** Facebook may flag accounts that delete/repost very
  aggressively. 10 days is gentle; going faster raises risk. This tool automates *your*
  account doing *your* normal listings — use it like a person would.
- This automates your own account and your own listings only. Respect Facebook's
  terms; you're responsible for how you use it.

---

## Project layout

```
marketplace/
├─ config.json              # all settings + the FB field labels
├─ templates/caption.txt    # the locked caption format (edit to taste)
├─ src/
│  ├─ server.js             # dashboard API + serves the UI, starts scheduler
│  ├─ login.js              # one-time interactive Facebook login
│  ├─ browser.js            # persistent Chromium context (your logged-in session)
│  ├─ poster.js             # fills + publishes the "Vehicle for sale" form
│  ├─ deleter.js            # deletes a listing from "Your listings"
│  ├─ service.js            # publish / relist / takedown + store updates
│  ├─ scheduler.js          # 10-day auto delete-and-relist loop
│  ├─ caption.js            # fills the template blanks
│  ├─ store.js              # local JSON listing store
│  ├─ fb.js                 # defensive Facebook UI helpers
│  └─ relist-cli.js         # one-shot relist for cron
├─ public/                  # the dashboard (index.html, app.js, styles.css)
└─ data/                    # runtime: profile, uploads, listings.json (gitignored)
```
