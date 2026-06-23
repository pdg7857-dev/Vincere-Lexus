/* AI generation for the carousel.
 *
 * Talks to the Anthropic Messages API directly from the browser when the user
 * has supplied their own key (stored in localStorage). Structured JSON output
 * is enforced via output_config.format so the deck shape is guaranteed.
 *
 * If no key is present (or a call fails), it falls back to a built-in
 * template generator so the core "type a topic, get a carousel" loop always
 * works — the AI just makes the copy better.
 */
(function () {
  "use strict";

  var KEY_LS = "carousel.anthropicKey";
  var MODEL_LS = "carousel.model";
  var DEFAULT_MODEL = "claude-sonnet-4-6";
  var API = "https://api.anthropic.com/v1/messages";

  function getKey() {
    return (localStorage.getItem(KEY_LS) || "").trim();
  }
  function setKey(k) {
    if (k && k.trim()) localStorage.setItem(KEY_LS, k.trim());
    else localStorage.removeItem(KEY_LS);
  }
  function getModel() {
    return localStorage.getItem(MODEL_LS) || DEFAULT_MODEL;
  }
  function setModel(m) {
    localStorage.setItem(MODEL_LS, m || DEFAULT_MODEL);
  }
  function hasKey() {
    return !!getKey();
  }

  // ---- server / subscription detection ------------------------------------
  // When the bundled server (carousel/server/server.js) runs with a host
  // credential, the browser routes through it (/api/messages) and no per-user
  // key is needed. _server is the cached auth mode: 'api' | 'subscription' |
  // 'none' | null (no server reachable).
  var _server; // undefined until first probe
  function probeServer() {
    if (_server !== undefined) return Promise.resolve(_server);
    return fetch("/api/health", { method: "GET" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        _server = j && j.server ? j.auth || "none" : null;
        return _server;
      })
      .catch(function () {
        _server = null;
        return _server;
      });
  }
  function serverActive() {
    return _server && _server !== "none";
  }

  // ---- Anthropic call ------------------------------------------------------

  function modeGuidance(mode) {
    if (mode === "creative")
      return "Creative mode: punchy standalone statements that work as bold typographic slides. One vivid idea per slide, no tweet framing.";
    if (mode === "custom")
      return "Custom mode: clean, on-brand copy the user can restyle freely.";
    return "Screenshot mode: written to read like a viral tweet thread — conversational, confident, scroll-stopping.";
  }

  function deckSchema() {
    return {
      type: "object",
      properties: {
        hook: { type: "string", description: "The opening scroll-stopper (slide 1)." },
        alt_hooks: {
          type: "array",
          items: { type: "string" },
          description: "3-4 alternative opening lines.",
        },
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              body: { type: "string", description: "Body copy for one slide. Short, one idea." },
              image_prompt: {
                type: ["string", "null"],
                description: "A concise image description, or null.",
              },
            },
            required: ["body", "image_prompt"],
            additionalProperties: false,
          },
        },
        outro: { type: "string", description: "Closing CTA slide copy." },
        suggested_caption: { type: "string", description: "Caption for the social post." },
      },
      required: ["hook", "alt_hooks", "slides", "outro", "suggested_caption"],
      additionalProperties: false,
    };
  }

  async function callAnthropic(body) {
    var useServer = serverActive();
    var url = useServer ? "/api/messages" : API;
    var headers = useServer
      ? { "content-type": "application/json" }
      : {
          "content-type": "application/json",
          "x-api-key": getKey(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        };
    var res = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      var detail = "";
      try {
        detail = (await res.json()).error.message;
      } catch (e) {}
      throw new Error("Anthropic API " + res.status + (detail ? ": " + detail : ""));
    }
    var data = await res.json();
    var text = "";
    (data.content || []).forEach(function (b) {
      if (b.type === "text") text += b.text;
    });
    return JSON.parse(text);
  }

  async function generateDeck(opts) {
    var bodyCount = Math.max(3, (opts.slideCount || 8) - 2); // minus hook + outro
    await probeServer();
    if (!serverActive() && !hasKey()) return fallbackDeck(opts, bodyCount);

    var system =
      "You are a world-class social media ghostwriter who writes viral image carousels. " +
      "Write short, punchy copy — one idea per slide, concrete and specific, no fluff or hashtags inside slides. " +
      modeGuidance(opts.mode);

    var user =
      'Create a carousel about: "' + opts.title + '".\n' +
      (opts.context ? "Additional context / tone: " + opts.context + "\n" : "") +
      "Produce exactly " + bodyCount + " body slides (between the hook and the outro). " +
      "The hook must stop the scroll. Each body slide delivers one actionable, memorable point. " +
      "The outro is a short call-to-action. " +
      (opts.includeImages
        ? "For body slides that would benefit from a supporting image, set image_prompt to a short description; otherwise null. "
        : "Set every image_prompt to null. ") +
      "Also give 3-4 alternative hooks and a ready-to-post caption.";

    var deck = await callAnthropic({
      model: getModel(),
      max_tokens: 2000,
      system: system,
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema: deckSchema() } },
    });
    deck._source = "ai";
    return deck;
  }

  async function regenerateSlide(opts) {
    // opts: { title, context, mode, kind, current, instruction }
    await probeServer();
    if (!serverActive() && !hasKey()) return fallbackRegen(opts);
    var schema = {
      type: "object",
      properties: { body: { type: "string" } },
      required: ["body"],
      additionalProperties: false,
    };
    var user =
      'Carousel topic: "' + opts.title + '". ' +
      (opts.context ? "Context: " + opts.context + ". " : "") +
      "Rewrite this " + opts.kind + " slide" +
      (opts.instruction ? " — " + opts.instruction : " to be sharper and more compelling") +
      ". Keep it short, one idea, no hashtags.\n\nCurrent text:\n" + opts.current;
    var out = await callAnthropic({
      model: getModel(),
      max_tokens: 400,
      system:
        "You rewrite individual carousel slides. Reply with improved copy only. " + modeGuidance(opts.mode),
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema: schema } },
    });
    return out.body;
  }

  // ---- offline fallback ----------------------------------------------------

  function fallbackDeck(opts, bodyCount) {
    var t = (opts.title || "your topic").trim().replace(/\.$/, "");
    var lower = t.charAt(0).toLowerCase() + t.slice(1);

    var hooks = [
      "Nobody tells you the truth about " + lower + ".",
      "I wish someone told me this about " + lower + " sooner.",
      "Most people get " + lower + " completely wrong. Here's the fix.",
      "Read this before you try " + lower + " again.",
    ];

    var templates = [
      "Start small. The hardest part of " + lower + " is the first 10 minutes — make those effortless.",
      "Consistency beats intensity. Show up daily, even when it's boring.",
      "Remove the friction. The fewer steps between you and the goal, the more often you'll do it.",
      "Track one number. What gets measured gets improved.",
      "Borrow systems, not motivation. Motivation fades; a good system runs on autopilot.",
      "Make it obvious. Put the cue where you can't miss it.",
      "Celebrate tiny wins. Momentum is a habit you build on purpose.",
      "Cut the noise. Most advice is optional — pick two things and go deep.",
      "Plan the next step before you stop. Future-you will thank present-you.",
      "Protect your energy. Your best hour is worth more than your longest hour.",
    ];
    var slides = [];
    for (var i = 0; i < bodyCount; i++) {
      slides.push({
        body: templates[i % templates.length],
        image_prompt: opts.includeImages && i % 2 === 0 ? "a clean flat-lay illustrating " + lower : null,
      });
    }
    return {
      hook: hooks[0],
      alt_hooks: hooks.slice(1),
      slides: slides,
      outro: "Found this useful? Follow for more on " + lower + " — and save this for later.",
      suggested_caption:
        t + " — a quick carousel. Which slide hit hardest? 👇  Save & share if it helped. #" +
        t.replace(/[^a-z0-9]+/gi, ""),
      _source: "template",
    };
  }

  function fallbackRegen(opts) {
    var variants = [
      "Here's the sharper version: " + opts.current,
      opts.current.replace(/\.$/, "") + " — and it works even on your busiest days.",
      "Try this instead: " + opts.current.charAt(0).toLowerCase() + opts.current.slice(1),
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  }

  window.CarouselAI = {
    generateDeck: generateDeck,
    regenerateSlide: regenerateSlide,
    refreshServer: probeServer, // -> Promise<'api'|'subscription'|'none'|null>
    serverActive: serverActive,
    hasKey: hasKey,
    getKey: getKey,
    setKey: setKey,
    getModel: getModel,
    setModel: setModel,
    DEFAULT_MODEL: DEFAULT_MODEL,
  };
})();
