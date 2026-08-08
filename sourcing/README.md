# Car Sourcing Pipeline

Find specific cars for specific customers, automatically. You describe what each
customer wants; the pipeline pulls current listings from a **pluggable source**,
remembers what it has already seen, and alerts you the moment a genuinely new
match appears — so you can be first to contact the seller.

```
wants.json ─► Source adapter ─► Store (dedupe + first-seen) ─► Matcher ─► Alert
 (customers)   (API / scrape /                (SQLite)          (score)   (console/
                sample)                                                     json/email)
```

## Quick start (no key, no network)

```bash
python3 -m sourcing.run --source sample --json
```

This runs the whole pipeline against built-in fixtures and prints a per-customer
digest. Run it twice — the second run reports **0 new matches**, proving the
dedupe works.

## Real, compliant runs

The **primary, recommended** source is a licensed listings API. Scraping
autotrader.ca directly is against its Terms of Service and is actively blocked;
a paid data feed is cheaper than it looks once you value your time and a
pipeline that doesn't break.

```bash
export MARKETCHECK_API_KEY=...          # https://www.marketcheck.com/apis
python3 -m sourcing.run --source marketcheck --email --json
```

Drop-in API alternatives (same adapter shape): Auto.dev, CarsXE, or an official
Auto Trader dealer/partner feed if you qualify. See
`adapters/marketcheck.py` — copy it, change the endpoint + field mapping, and
register it in `adapters/__init__.py`.

The polite-scrape fallback exists for spot checks only and will usually be
WAF-blocked from a server:

```bash
python3 -m sourcing.run --source autotrader.ca
```

## Describing what customers want

Copy `data/sourcing/wants.example.json` to `data/sourcing/wants.json` (gitignored
— your customer data stays local) and edit. Each brief:

| field | meaning |
|-------|---------|
| `make`, `model`, `condition`, `province` | any-of lists; empty = no restriction |
| `year_min/max`, `price_min/max`, `km_max` | numeric bounds |
| `trim_contains` | substring the trim must contain |
| `must` | keywords that **all** must appear (e.g. `"AWD"`) — a miss disqualifies |
| `nice` | keywords that boost the score (e.g. `"panoramic"`) |
| `active` | `false` pauses a want without deleting it |

Point the runner at it with `--wants data/sourcing/wants.json`.

## Scheduling

Run it on an interval so you catch cars early. Cron every 3 hours:

```cron
0 */3 * * *  cd /path/to/vincere-lexus && MARKETCHECK_API_KEY=... python3 -m sourcing.run --source marketcheck --email --json
```

The SQLite store (`data/sourcing/listings.db`) guarantees each customer is
alerted about a given car only once, and also tracks **price drops** on cars
already in the store.

## Email digests (optional)

`--email` sends an SMTP digest when these env vars are set (all others degrade
gracefully to console only):

```
SOURCING_SMTP_HOST, SOURCING_SMTP_PORT (default 587),
SOURCING_SMTP_USER, SOURCING_SMTP_PASS,
SOURCING_MAIL_FROM, SOURCING_MAIL_TO   # comma-separated
```

## Layout

```
sourcing/
  run.py            CLI entrypoint (load -> fetch -> store -> match -> alert)
  models.py         Listing / Want / Match dataclasses
  matcher.py        hard filters + 0-100 scoring
  store.py          SQLite: dedupe, first-seen, price history, alert log
  alert.py          Console / JSON / Email notifiers
  util.py           polite fetch, robots.txt, JSON-LD extraction
  adapters/
    base.py         SearchAdapter interface
    marketcheck.py  licensed API  (primary — compliant)
    autotrader_ca.py polite scrape (fallback — ToS-gray, fragile)
    sample.py       offline fixtures (dev / demo)
data/sourcing/
  wants.example.json   template briefs (tracked)
  wants.json           your real briefs (gitignored)
  listings.db          local state (gitignored)
```

## A note on data sources & the law

Auto Trader's Terms prohibit scraping, and all three regional sites defend
against it. For a business you rely on, build on licensed data (the
`marketcheck` adapter) — it's reliable, in-terms, and won't vanish when a site
changes. The scraper is a deliberately-polite fallback, not the foundation.
Whatever source you use, your real edge is the matching + speed of contact this
pipeline gives you, not the raw listings.
