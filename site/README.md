# Phil Dave — Private Automotive Concierge (website)

A self-contained, Lamborghini-inspired luxury concierge site: full-bleed
imagery, stark high-contrast, bold uppercase display type. No prices anywhere.
No build step, no server, no dependencies — just open `index.html`.

```
open site/index.html
# or serve it:
python3 -m http.server 8088 --directory site
```

Hosted from this repo via CDN:
```
https://raw.githack.com/pdg7857-dev/vincere-lexus/<commit-sha>/site/index.html
```

## Sections
Hero · makes marquee · positioning · 3-step process · **gallery** · About ·
"Tell me what you want" brief form · footer.

## Photos
All images live in `site/media/`:

| File | What it is |
|------|------------|
| `gallery-1.jpg` | Phil on location (his own photo) |
| `gallery-2..7.jpg` | Audi R8 · BMW M8 · Mercedes-AMG GT · Audi RS Q8 · Range Rover · Lexus LX 600 |
| `phil-portrait.jpg` | Phil portrait, used in the About section |

- **Phil's two photos** (portrait + on-location) are his own.
- **Car photos** are sourced from Wikimedia Commons (CC-BY-SA). Attribution is
  recorded in `media/CREDITS.txt` and linked from the footer. Swap any of them
  for Phil's own photography anytime — just keep the same filename.
- Any missing/failed image shows a tasteful "PHOTO" placeholder automatically.

### Hero video (optional, $0 today)
The hero looks finished with a cinematic CSS backdrop. To drop in a real clip
(Higgsfield, stock, or filmed): save a short silent looping mp4 (H.264, ~6–12s)
as `site/media/hero.mp4` — it auto-plays full-bleed. No code change needed.

## Effects (all front-end code, not AI)
Custom cursor + magnetic buttons, scroll progress, scroll/word reveals,
animated hero, infinite makes marquee, image hover-zoom. Respects
`prefers-reduced-motion`.
