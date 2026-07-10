# AC Mechanical Refrigeration Ltd. — Website

A complete, responsive, accessible multi-page marketing and business-to-government
(B2G) website for **AC Mechanical Refrigeration Ltd.**, an Ottawa-based mechanical,
HVAC-R and refrigeration contractor targeting government and institutional contracts.

Built as a **static site** — plain semantic HTML, one CSS file, one small
progressive-enhancement JS file. No build step, no framework, no dependencies.
It will run on any static host (or by opening the files directly).

---

## What's included

| File | Page |
|------|------|
| `index.html` | Home |
| `services.html` | Services (detailed) |
| `government.html` | **Government & Institutional** — the B2G hub / capability statement (most important page) |
| `certifications.html` | Certifications, Bonding & Compliance |
| `projects.html` | Projects / Past Performance |
| `about.html` | About (history, team, safety culture) |
| `service-area.html` | Service Area |
| `contact.html` | Contact / Request a Quote / Invite Us to Bid (RFQ form) |
| `capability-statement.html` | Printable one-page capability statement (source for the PDF) |
| `downloads/AC-Mechanical-Capability-Statement.pdf` | **The one-page Capability Statement PDF** (a standard B2G asset) |
| `assets/css/style.css` | Design system (navy + steel + white + amber accent) |
| `assets/js/main.js` | Mobile nav, form handling, footer year |
| `assets/img/*.svg` | Logo, favicon, credential badges, service-area map |
| `robots.txt`, `sitemap.xml` | SEO |

---

## How to preview locally

Open `index.html` in a browser, or serve the folder (recommended, so the RFQ
`mailto` fallback and relative links behave):

```bash
cd ac-mechanical
python3 -m http.server 8080
# then visit http://localhost:8080
```

---

## How to publish

Any static host works. Point the host at the `ac-mechanical/` folder (or copy its
contents to your web root).

- **Netlify / Cloudflare Pages / GitHub Pages / Vercel:** drag-and-drop the folder,
  or connect the repo and set the publish/output directory to `ac-mechanical`.
- **Traditional hosting:** upload the contents of `ac-mechanical/` via SFTP to your
  web root (e.g. `public_html`). Ensure `index.html` is the default document.
- **Custom domain:** update the absolute URLs in `sitemap.xml`, `robots.txt`, and the
  `<link rel="canonical">` / `og:*` / JSON-LD `url` fields in each page's `<head>`
  from `https://www.acmechanical.example/` to your real domain.

---

## ⚠️ Before you go live — required steps

### 1. Complete the `[INSERT: …]` placeholders
The site deliberately marks every unverified fact with a highlighted
`[INSERT: …]` token so nothing is fabricated (government contracting requires
truthful representations). Search the project for `INSERT` and fill in / remove each:

```bash
grep -rn "INSERT" ac-mechanical --include=*.html
```

Placeholders to complete (owner to supply verified values):

- Phone, email, address, business hours, 24/7 emergency line
- Business Number
- CanadaBuys / PSPC supplier registration #
- MERX / Ontario Vendor-of-Record #
- Controlled Goods Program registration (if any)
- Exact security clearance level
- WSIB clearance #
- Bonding capacity & surety; CGL insurance limits
- TSSA certification # and categories
- Health & safety program (COR / ISO 45001, if held); environmental (ISO 14001, if held)
- Named reference projects & public-sector clients (Projects page & Government page)
- Key personnel names / titles / tickets
- UNSPSC / GSIN procurement codes (NAICS 238220 is already filled in)
- Real company photography (see below)

Remember to update the **capability statement PDF** after editing its source — see
step 4.

### 2. Wire up the contact / RFQ form
`contact.html` contains a full RFQ / bid-invitation form with a file-upload field
and a honeypot spam trap, but **no backend is connected**. In the current build it
validates fields and opens a pre-filled email draft as a fallback. Before launch:

- Set the `<form action="…">` to your form endpoint (e.g. Formspree, Netlify Forms,
  Basin, or your own handler) and the `data-mailto="…"` attribute to your
  procurement inbox.
- Add a CAPTCHA (reCAPTCHA / hCaptcha / Cloudflare Turnstile) for stronger spam
  protection.
- Confirm your backend's max upload size and update the hint text.

### 3. Replace imagery
Add real mechanical / refrigeration / plant-room / technician-in-PPE photography
(avoid cheesy stock). The hero uses a clean navy treatment that works with or
without a background photo; drop a photo in behind the hero via CSS if desired.
Replace `assets/img/service-area-map.svg` with a mapped/branded coverage graphic
or an embedded map if you prefer.

### 4. Regenerate the Capability Statement PDF (if you edit its source)
The PDF was generated from `capability-statement.html`. After editing that file,
regenerate with headless Chrome/Chromium:

```bash
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=downloads/AC-Mechanical-Capability-Statement.pdf \
  capability-statement.html
```

(Or simply open `capability-statement.html` and use **Print → Save as PDF**, Letter
size, margins "Default", background graphics ON. The page is tuned to fit one page.)

---

## Accessibility (WCAG 2.1 AA / AODA)

The site was built with government accessibility expectations in mind:

- Semantic landmarks (`header`, `nav`, `main`, `footer`), one `<h1>` per page and a
  logical heading hierarchy.
- "Skip to main content" link; visible keyboard focus styles; keyboard-operable
  mobile menu (Esc to close).
- Descriptive `alt` text on meaningful images; decorative images use empty `alt`.
- Colour contrast targets AA (navy/white, amber accent used for large text / on
  dark or on the amber-on-navy CTA which meets AA).
- Form labels associated with inputs; required fields marked; `aria-live` status.
- `prefers-reduced-motion` respected.

**Recommended before launch:** run automated checks (axe DevTools, Lighthouse, WAVE)
and a manual keyboard/screen-reader pass, then publish an accessibility statement if
required by your AODA obligations.

---

## SEO

- Per-page `<title>`, meta description, keywords, canonical, and Open Graph tags.
- Local SEO copy for Ottawa and each eastern-Ontario community.
- `schema.org` `LocalBusiness` structured data (JSON-LD) with `areaServed` on the
  home page.
- `sitemap.xml` and `robots.txt` included — update the domain, then submit the
  sitemap in Google Search Console / Bing Webmaster Tools.

---

## Content rules honoured

Only the verified facts provided were used. No certifications, clearances, clients,
project details, numbers, or awards were invented. Everything unknown is a clearly
marked `[INSERT: …]` placeholder for the owner to complete with verifiable
information.
