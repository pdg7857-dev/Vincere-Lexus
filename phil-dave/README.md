# Phil Dave — Private Luxury Car Sourcing (GTA)

A single-page, high-motion marketing site for **Phil Dave**, a private luxury
car sourcer serving the Greater Toronto Area. Dark, cinematic "private garage"
aesthetic in black & platinum — a car on a lit pedestal, glowing hotspots that
**warp** you into four "rooms," buttery smooth scrolling, and a refined lead form.

It is a **static site with no build step** and **no third-party CDN dependency** —
every library, font and asset is self-hosted in this folder. Open `index.html`
and it runs.

---

## Run / preview

```bash
# just open it
open phil-dave/index.html

# or serve (recommended — fonts & module loading behave better over http)
python3 -m http.server 8000
# → http://localhost:8000/phil-dave/index.html
```

Or share it straight from the repo via a CDN, same as the rest of this project:

```
https://raw.githack.com/pdg7857-dev/vincere-lexus/<commit-sha>/phil-dave/index.html
```

---

## Editing content — you never touch the animation code

**Everything you'll want to change lives in [`js/data.js`](js/data.js).** Replace
the values marked `[PLACEHOLDER]`:

| What | Where in `js/data.js` |
|------|------------------------|
| Tagline (drives the hero word too) | `tagline` |
| Phone / email / Instagram | `contact` |
| Lead-form destination | `formEndpoint` (see below) |
| Cars in the Inventory room | `inventory[]` — copy a block to add one |
| Sourcing steps | `process[]` |
| About copy | `about` |
| Stats & client quotes | `stats[]`, `testimonials[]` |
| The 7 marques | `marques[]` |

`inventory[].status` is `"Available"`, `"Sourced"`, or `"Sold"`. Leave
`image: ""` for an elegant marque card, or point it at a photo in `assets/`.
Empty the `inventory` array and the room shows a graceful "New arrivals incoming."

### Wiring the lead form

Until you set `formEndpoint`, the form runs in **demo mode**: it validates,
logs the submission to the console, and opens the visitor's email client
pre-filled to your address. To receive submissions automatically, create a free
form at [formspree.io](https://formspree.io) and paste its endpoint into
`formEndpoint` (e.g. `"https://formspree.io/f/xxxxxxx"`). No other change needed.

---

## The hero — swapping the car

The hero is **image/illustration based by default** (the platinum car in
`assets/car.svg`) and is built to upgrade to real 3D with zero code changes:

- **Use a photo:** set `heroImage: "assets/your-car.webp"` in `data.js`.
- **Use a real 3D model (Three.js turntable, drag-to-rotate):** drop a `.glb`
  in `models/` and set `heroModel: "models/car.glb"`. The site lazy-loads
  Three.js + GLTFLoader on demand and swaps the 2D hero for a live turntable.
  Falls back to the 2D hero on mobile, reduced-motion, or if the model fails.

---

## What's where

```
phil-dave/
├─ index.html            # markup + meta/OG/SEO + structured data
├─ css/
│  ├─ fonts.css          # self-hosted @font-face (Cormorant Garamond, Inter)
│  └─ style.css          # all styling (black & platinum design system)
├─ js/
│  ├─ data.js            # ← ALL content & config (edit this)
│  ├─ main.js            # animation + interaction layer (Lenis, GSAP, hotspots)
│  └─ vendor/            # self-hosted GSAP, ScrollTrigger, Lenis
├─ assets/
│  ├─ car.svg            # the hero car illustration (swappable)
│  ├─ favicon.svg, og.svg
│  └─ fonts/             # woff2 (self-hosted)
└─ models/               # drop a car.glb here to enable 3D
```

---

## Built-in quality

- **Smooth scroll** (Lenis) + **GSAP ScrollTrigger** reveals, pins & parallax.
- **Cinematic room transitions** — a camera-push "warp" pulls you into each room.
- **Magnetic buttons**, custom cursor, pulsing hotspots, film grain & vignette,
  drifting light particles, a pedestal turntable, and a "lights come up" intro.
- **Responsive** — heavy effects simplify to performant fallbacks on mobile.
- **Accessible** — honours `prefers-reduced-motion` (calm, near-static version),
  keyboard-navigable hotspots, alt text, focus styles, semantic headings.
- **SEO** — title, description, Open Graph image, and `AutoBroker` structured
  data with a local "GTA / Toronto" angle.

## Credits / licensing

- [GSAP](https://gsap.com) + ScrollTrigger, [Lenis](https://github.com/darkroomengineering/lenis).
- Fonts: Cormorant Garamond & Inter (SIL Open Font License), self-hosted.
