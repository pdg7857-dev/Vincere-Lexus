# Carousel — AI carousel generator

Type a topic, get a finished, post-ready image **carousel** in the popular
"tweet screenshot" style. The AI writes the hook and per-slide copy, the app
renders each slide to a pixel-perfect image, you review and edit, then export
to PNG or PDF.

> **Core promise:** type a topic → get a carousel → post it.

It's a **static, no-build, single-page app** (the same shape as the rest of this
repo) — open `index.html` and it runs. The slide renderer and exporters are
100% client-side; the only network call is the optional one to the Anthropic
API for copywriting.

## Open it

```
open carousel/index.html        # or double-click it
```

Or host it from the repo via a CDN (works on phones/tablets — add to home screen):

```
https://raw.githack.com/pdg7857-dev/vincere-lexus/<commit-sha>/carousel/index.html
```

Or serve locally:

```
python3 -m http.server 8088 --directory carousel
# visit http://localhost:8088
```

## The flow (linear wizard, jump back anytime)

1. **Topic** — pick a mode, give the carousel a title, optionally add context,
   choose slide count / format, and set your brand (name, @handle, accent,
   avatar, verified badge). Hit **Generate**.
2. **Hook** — the AI proposes the opening scroll-stopper plus alternatives.
   Pick one or edit it. This becomes slide 1.
3. **Copy** — edit every slide's body, reorder (↑/↓), add/remove slides, or
   **regenerate a single slide** with one click.
4. **Review** — all slides as a thumbnail grid. Click any slide to edit its
   text or regenerate it (with a live preview), or **approve all**.
5. **Export** — download every slide as a **PNG**, or the whole deck as a
   single **PDF**, and copy the suggested caption.

## Modes

- **Screenshot** — faux-tweet cards: white rounded panel, avatar, name/@handle,
  verified badge, body text, optional image placeholder, dark outro/CTA slide.
- **Creative** — bold full-bleed typographic slides on an accent gradient.
- **Custom** — screenshot layout with your branding fully in your control.

Both **square (1080×1080)** and **portrait (1080×1350)** canvases are supported.

## The slide renderer

Slides are drawn directly onto an HTML5 **Canvas** at full export resolution
(`render.js`). Drawing text to the canvas ourselves — rather than rasterizing a
DOM node with html2canvas — gives deterministic output with reliable font and
emoji rendering, and effortless PNG/PDF export. Body text auto-wraps and
shrinks-to-fit so every slide stays balanced.

The PDF exporter (`app.js → buildPdf`) writes a minimal, dependency-free PDF
with one full-bleed JPEG page per slide, so "Download PDF" needs no library.

## AI generation

Generation (`generate.js`) calls the **Anthropic Messages API** with **structured
JSON output** so the deck shape is guaranteed:

```json
{
  "hook": "string",
  "alt_hooks": ["string"],
  "slides": [{ "body": "string", "image_prompt": "string|null" }],
  "outro": "string",
  "suggested_caption": "string"
}
```

- Add your Anthropic API key in **⚙ Settings**. It's stored only in your browser
  (`localStorage`) and sent directly to `api.anthropic.com` from the page
  (`anthropic-dangerous-direct-browser-access`). Default model:
  **`claude-sonnet-4-6`** (also selectable: Opus 4.8, Haiku 4.5).
- **No key?** The app falls back to a built-in offline template writer, so the
  whole "type a topic → render → download" loop still works — the AI just makes
  the copy sharper.

### A note on the key

A static page can't hold a secret, so this MVP asks each user for their own key.
For a hosted multi-user product, move the Anthropic call behind a small server
route (e.g. `/api/generate`) and keep the key server-side — `generate.js` is the
single place to swap the endpoint.

## Files

```
carousel/index.html   # wizard markup + stepper + modals
carousel/styles.css   # styling
carousel/render.js    # canvas slide renderer (CarouselRender)
carousel/generate.js  # Anthropic call + offline fallback (CarouselAI)
carousel/app.js       # wizard state machine, editing, PNG/PDF export
```

## Roadmap (build order)

Shipped: the full MVP loop (topic → AI deck → render → review/edit →
download PNG/PDF), per-slide inline + modal editing with regenerate-one, the
mode selector, additional context, and brand controls.

Next: real image generation for `image_prompt` slides, file/URL context
extraction, auth + saved carousels with Free/Pro gating, Topic Ideas / "In the
news" from posting history, and scheduling / auto-post connectors.
