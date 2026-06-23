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

**Recommended — run it through your Claude subscription (no API key in the app):**

```
# authenticate once with your Claude Pro/Max subscription
ant auth login
export ANTHROPIC_AUTH_TOKEN=$(ant auth print-credentials --access-token)
# (or, to bill an API key instead: export ANTHROPIC_API_KEY=sk-ant-…)

node carousel/server/server.js     # serves the app + an authenticated proxy
# visit http://localhost:8088
```

The bundled server holds the credential and exposes `/api/messages`; the page
detects it and routes generation through it automatically — visitors never paste
a key. See **Auth modes** below.

**Static only (no server):** open the file directly or host it on a CDN — then
each user supplies their own API key in ⚙ Settings (or uses the offline writer).

```
open carousel/index.html        # or double-click it
```

```
https://raw.githack.com/pdg7857-dev/vincere-lexus/<commit-sha>/carousel/index.html
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

Default model: **`claude-sonnet-4-6`** (also selectable: Opus 4.8, Haiku 4.5).

### Auth modes

The app picks the first available, in this order:

1. **Server / subscription (recommended)** — if the bundled server
   (`server/server.js`) is running with a credential, the page calls its
   `/api/messages` proxy and **no key is needed in the browser**. The proxy
   authenticates with, in order:
   - `ANTHROPIC_AUTH_TOKEN` → a Claude **subscription** token, sent as
     `Authorization: Bearer` + the `oauth-2025-04-20` beta header; or
   - `ANTHROPIC_API_KEY` → sent as `x-api-key`.

   This is how you "run it through your subscription" — a static page can't hold
   a credential, so the small proxy does. It's a thin pass-through meant for
   local / trusted use (anyone who can reach it can spend the credential), so
   put your own auth in front before exposing it publicly.
2. **Browser API key** — paste a key in ⚙ Settings (stored only in
   `localStorage`, sent directly to `api.anthropic.com`).
3. **Offline** — a built-in template writer, so the whole "type a topic →
   render → download" loop works with no credentials at all.

`generate.js` is the single place that chooses the endpoint.

## Files

```
carousel/index.html   # wizard markup + stepper + modals
carousel/styles.css   # styling
carousel/render.js    # canvas slide renderer (CarouselRender)
carousel/generate.js  # auth detection + Anthropic call + offline fallback (CarouselAI)
carousel/app.js       # wizard state machine, editing, PNG/PDF export
carousel/server/      # zero-dep Node host + authenticated /api/messages proxy
```

## Roadmap (build order)

Shipped: the full MVP loop (topic → AI deck → render → review/edit →
download PNG/PDF), per-slide inline + modal editing with regenerate-one, the
mode selector, additional context, and brand controls.

Next: real image generation for `image_prompt` slides, file/URL context
extraction, auth + saved carousels with Free/Pro gating, Topic Ideas / "In the
news" from posting history, and scheduling / auto-post connectors.
