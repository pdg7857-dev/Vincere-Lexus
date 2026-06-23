# Phil Dave — Private Automotive Concierge (website)

A self-contained, luxury concierge landing site. No build step, no server, no
dependencies — just open `index.html`.

```
open site/index.html
# or serve it:
python3 -m http.server 8088 --directory site
```

Hosted from this repo via CDN:
```
https://raw.githack.com/pdg7857-dev/vincere-lexus/<commit-sha>/site/index.html
```

## What it is
A marketing + lead-capture site that positions Phil Dave as an independent
"go-to" automotive concierge — any make, any model, luxury focus — with a few
hand-picked real vehicles from the Northwest Lexus dealer network shown under
Phil's own brand so he stays independent.

Sections: Hero · Makes marquee · Positioning · 3-step process · Featured
collection · About · "Tell me what you want" brief form · Footer.

## Adding a Higgsfield (or any) hero video later — $0 today
The hero already looks finished with a cinematic CSS backdrop. To drop in a
real clip:

1. Generate / export a short, silent, looping clip (1080p, ~6–12s, mp4/H.264).
2. Save it as `site/media/hero.mp4`.
3. That's it — it auto-plays behind the hero (semi-transparent over the backdrop).
   Optionally add a `poster` image on the `<video>` tag in `index.html`.

A still portrait of Phil can replace the "PD" monogram in the About section —
see the comment in `index.html` (`media/phil.jpg`).

## Updating the featured cars
Edit the `CARS` array at the top of `app.js` (make, name, year, price,
condition, color, odo, url). Pull fresh picks from `../data/inventory.json`.

## Effects under the hood (all front-end code, not AI)
Custom cursor + magnetic buttons, scroll progress, scroll/word reveals,
hero parallax glow, infinite makes marquee, smooth section transitions.
Respects `prefers-reduced-motion`.
