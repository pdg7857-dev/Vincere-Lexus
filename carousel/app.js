/* Carousel wizard: Topic -> Hook -> Copy -> Review -> Export.
 * Plain vanilla JS, no build step — matches this repo's static-app pattern.
 */
(function () {
  "use strict";

  var R = window.CarouselRender;
  var AI = window.CarouselAI;

  var STEPS = ["topic", "hook", "copy", "review", "done"];

  var state = {
    step: "topic",
    reached: { topic: true },
    mode: "screenshot",
    title: "",
    context: "",
    slideCount: 8,
    format: "portrait",
    includeImages: false,
    brand: {
      name: "Your Name",
      handle: "@yourhandle",
      accent: "#1d9bf0",
      verified: true,
      avatarImage: null,
    },
    deck: null, // raw AI deck (hook, alt_hooks, slides, outro, caption)
    slides: [], // editable: [{ text, kind:'hook'|'body'|'outro', imagePrompt }]
    caption: "",
  };

  var IDEAS = [
    "How to be a morning person",
    "5 habits that changed my life",
    "Beginner mistakes in personal finance",
    "Lessons from my first year freelancing",
    "How to actually stick to a workout",
    "Productivity myths to stop believing",
    "What I'd tell my 20-year-old self",
    "A simple system for better sleep",
  ];

  // ---- tiny DOM helpers ----------------------------------------------------
  function $(s, r) {
    return (r || document).querySelector(s);
  }
  function $all(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.hidden = true;
    }, 2600);
  }

  // ---- slide model ---------------------------------------------------------
  function deckToSlides(deck) {
    var slides = [{ text: deck.hook, kind: "hook", imagePrompt: null }];
    (deck.slides || []).forEach(function (s) {
      slides.push({ text: s.body, kind: "body", imagePrompt: s.image_prompt || null });
    });
    slides.push({ text: deck.outro, kind: "outro", imagePrompt: null });
    return slides;
  }

  function slideForRender(s, i) {
    return {
      text: s.text,
      kind: s.kind,
      index: i + 1,
      total: state.slides.length,
      mode: state.mode,
      brand: state.brand,
      includeImages: state.includeImages,
      imagePrompt: s.imagePrompt,
    };
  }

  function badgeFor(kind) {
    return kind === "hook" ? "Hook" : kind === "outro" ? "Outro / CTA" : "Slide";
  }

  // ---- navigation ----------------------------------------------------------
  function go(step) {
    state.step = step;
    state.reached[step] = true;
    $all(".screen").forEach(function (s) {
      s.hidden = s.getAttribute("data-screen") !== step;
    });
    var idx = STEPS.indexOf(step);
    $all(".step").forEach(function (b) {
      var bs = b.getAttribute("data-step");
      var bi = STEPS.indexOf(bs);
      b.classList.toggle("active", bs === step);
      b.classList.toggle("done", bi < idx && state.reached[bs]);
      b.disabled = !state.reached[bs];
    });
    if (step === "hook") renderHookStep();
    if (step === "copy") renderCopyStep();
    if (step === "review") renderReviewStep();
    if (step === "done") renderDoneStep();
    window.scrollTo(0, 0);
  }

  // ---- STEP 1: topic -------------------------------------------------------
  function initTopic() {
    // mode
    $all("#modeSel .mode").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-mode") === state.mode);
      b.addEventListener("click", function () {
        state.mode = b.getAttribute("data-mode");
        $all("#modeSel .mode").forEach(function (x) {
          x.classList.toggle("active", x === b);
        });
      });
    });
    // ideas
    var wrap = $("#ideaChips");
    IDEAS.forEach(function (idea) {
      var c = el("button", "chip", idea);
      c.type = "button";
      c.addEventListener("click", function () {
        $("#title").value = idea;
        $("#title").focus();
      });
      wrap.appendChild(c);
    });
    // brand inputs
    $("#bName").addEventListener("input", function (e) {
      state.brand.name = e.target.value;
    });
    $("#bHandle").addEventListener("input", function (e) {
      state.brand.handle = e.target.value;
    });
    $("#bAccent").addEventListener("input", function (e) {
      state.brand.accent = e.target.value;
    });
    $("#bVerified").addEventListener("change", function (e) {
      state.brand.verified = e.target.checked;
    });
    $("#bAvatar").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          state.brand.avatarImage = img;
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(f);
    });

    $("#generateBtn").addEventListener("click", onGenerate);
    $("#title").addEventListener("keydown", function (e) {
      if (e.key === "Enter") onGenerate();
    });

    updateKeynote();
  }

  function updateKeynote() {
    var note = $("#keynote");
    AI.refreshServer().then(function (mode) {
      if (mode && mode !== "none") {
        note.innerHTML =
          mode === "subscription"
            ? "Generating through the host <strong>Claude subscription</strong> — no key needed."
            : "Generating through the host server credential — no key needed.";
        return;
      }
      if (AI.hasKey()) {
        note.innerHTML = "Generating with <strong>" + AI.getModel() + "</strong>.";
        return;
      }
      note.innerHTML =
        "No credentials — using the built-in offline writer. " +
        '<a href="#" id="addKeyLink">Add an Anthropic key</a>, or run the bundled server with your subscription.';
      var link = $("#addKeyLink");
      if (link)
        link.addEventListener("click", function (e) {
          e.preventDefault();
          openSettings();
        });
    });
  }

  async function onGenerate() {
    var title = $("#title").value.trim();
    if (!title) {
      toast("Give your carousel a title first.");
      $("#title").focus();
      return;
    }
    state.title = title;
    state.context = $("#context").value.trim();
    state.slideCount = clamp(parseInt($("#slideCount").value, 10) || 8, 4, 10);
    state.format = $("#format").value;
    state.includeImages = $("#includeImages").checked;

    var btn = $("#generateBtn");
    btn.disabled = true;
    btn.textContent = "Writing your carousel…";
    try {
      var deck = await AI.generateDeck({
        title: state.title,
        context: state.context,
        mode: state.mode,
        slideCount: state.slideCount,
        includeImages: state.includeImages,
      });
      state.deck = deck;
      state.slides = deckToSlides(deck);
      state.caption = deck.suggested_caption || "";
      toast(deck._source === "ai" ? "Generated with Claude." : "Generated offline (no API key).");
      go("hook");
    } catch (err) {
      console.error(err);
      toast(err.message || "Generation failed. Check your API key in Settings.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Generate carousel →";
    }
  }

  // ---- STEP 2: hook --------------------------------------------------------
  function renderHookStep() {
    var hook = state.slides[0];
    $("#hookText").value = hook.text;
    $("#hookText").oninput = function () {
      hook.text = this.value;
    };
    var wrap = $("#altHooks");
    wrap.innerHTML = "";
    var alts = (state.deck && state.deck.alt_hooks) || [];
    alts.forEach(function (h) {
      var c = el("button", "chip", h);
      c.type = "button";
      c.addEventListener("click", function () {
        hook.text = h;
        $("#hookText").value = h;
      });
      wrap.appendChild(c);
    });
  }

  // ---- STEP 3: copy --------------------------------------------------------
  function renderCopyStep() {
    var list = $("#copyList");
    list.innerHTML = "";
    state.slides.forEach(function (s, i) {
      list.appendChild(copyItem(s, i));
    });
  }

  function copyItem(s, i) {
    var item = el("div", "copyitem");
    var head = el("div", "copyhead");
    head.appendChild(el("span", "badge", badgeFor(s.kind)));
    head.appendChild(el("span", "spacer"));

    var up = iconBtn("↑", "Move up", i === 0);
    up.addEventListener("click", function () {
      move(i, -1);
    });
    var down = iconBtn("↓", "Move down", i === state.slides.length - 1);
    down.addEventListener("click", function () {
      move(i, 1);
    });
    var regen = iconBtn("↻", "Regenerate", false);
    regen.addEventListener("click", function () {
      regenInline(i, regen);
    });
    var del = iconBtn("✕", "Delete", state.slides.length <= 1);
    del.addEventListener("click", function () {
      state.slides.splice(i, 1);
      renderCopyStep();
    });
    head.appendChild(up);
    head.appendChild(down);
    head.appendChild(regen);
    head.appendChild(del);
    item.appendChild(head);

    var ta = el("textarea");
    ta.rows = 2;
    ta.value = s.text;
    ta.addEventListener("input", function () {
      s.text = ta.value;
    });
    autoGrow(ta);
    item.appendChild(ta);
    return item;
  }

  function iconBtn(label, title, disabled) {
    var b = el("button", "iconbtn", label);
    b.type = "button";
    b.title = title;
    b.disabled = !!disabled;
    return b;
  }

  function move(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= state.slides.length) return;
    var tmp = state.slides[i];
    state.slides[i] = state.slides[j];
    state.slides[j] = tmp;
    renderCopyStep();
  }

  async function regenInline(i, btn) {
    var s = state.slides[i];
    btn.disabled = true;
    btn.textContent = "…";
    try {
      var text = await AI.regenerateSlide({
        title: state.title,
        context: state.context,
        mode: state.mode,
        kind: s.kind,
        current: s.text,
      });
      s.text = text;
      renderCopyStep();
    } catch (err) {
      toast(err.message || "Couldn't regenerate.");
    } finally {
      btn.disabled = false;
      btn.textContent = "↻";
    }
  }

  $("#addSlide") &&
    document.addEventListener("click", function (e) {
      if (e.target && e.target.id === "addSlide") {
        // insert a body slide before the outro if present
        var insertAt = state.slides.length;
        if (state.slides.length && state.slides[state.slides.length - 1].kind === "outro")
          insertAt = state.slides.length - 1;
        state.slides.splice(insertAt, 0, { text: "New slide — write your point here.", kind: "body", imagePrompt: null });
        renderCopyStep();
      }
    });

  // ---- STEP 4: review ------------------------------------------------------
  function buildThumbs(container, withDownload) {
    container.innerHTML = "";
    var ar = state.format === "square" ? "1 / 1" : "4 / 5";
    var off = document.createElement("canvas");
    state.slides.forEach(function (s, i) {
      R.renderSlide(off, slideForRender(s, i), state.format);
      var url = off.toDataURL("image/png");
      var thumb = el("div", "thumb");
      thumb.style.setProperty("--ar", ar);
      var img = el("img");
      img.src = url;
      img.alt = "Slide " + (i + 1);
      thumb.appendChild(img);
      thumb.appendChild(el("span", "num", String(i + 1)));
      if (withDownload) {
        var dl = el("button", "dl", "⬇ PNG");
        dl.addEventListener("click", function (e) {
          e.stopPropagation();
          downloadSlide(i);
        });
        thumb.appendChild(dl);
      } else {
        thumb.appendChild(el("div", "edit-overlay", "✎ Edit"));
        thumb.addEventListener("click", function () {
          openEditor(i);
        });
      }
      container.appendChild(thumb);
    });
  }

  function renderReviewStep() {
    buildThumbs($("#reviewGrid"), false);
  }

  // ---- STEP 5: done --------------------------------------------------------
  function renderDoneStep() {
    $("#captionText").value = state.caption;
    $("#captionText").oninput = function () {
      state.caption = this.value;
    };
    buildThumbs($("#exportGrid"), true);
  }

  // ---- slide editor modal --------------------------------------------------
  var editingIndex = -1;
  function openEditor(i) {
    editingIndex = i;
    var s = state.slides[i];
    $("#editorTitle").textContent = "Edit " + badgeFor(s.kind).toLowerCase() + " (slide " + (i + 1) + ")";
    $("#editorText").value = s.text;
    $("#editorInstruction").value = "";
    refreshEditorPreview();
    $("#editorModal").hidden = false;
  }
  function refreshEditorPreview() {
    var s = { text: $("#editorText").value, kind: state.slides[editingIndex].kind, imagePrompt: state.slides[editingIndex].imagePrompt };
    R.renderSlide($("#editorCanvas"), slideForRender(s, editingIndex), state.format);
  }
  function closeEditor() {
    $("#editorModal").hidden = true;
    editingIndex = -1;
  }

  // ---- export: PNG ---------------------------------------------------------
  function downloadSlide(i) {
    var off = document.createElement("canvas");
    R.renderSlide(off, slideForRender(state.slides[i], i), state.format);
    off.toBlob(function (blob) {
      saveBlob(blob, fileBase() + "-slide-" + pad(i + 1) + ".png");
    }, "image/png");
  }

  async function downloadAll() {
    for (var i = 0; i < state.slides.length; i++) {
      downloadSlide(i);
      await sleep(250); // stagger so browsers don't block multiple downloads
    }
    toast("Downloaded " + state.slides.length + " PNGs.");
  }

  // ---- export: PDF (one image per page, no dependencies) -------------------
  function downloadPdf() {
    var dim = R.DIMS[state.format];
    var pages = [];
    var off = document.createElement("canvas");
    for (var i = 0; i < state.slides.length; i++) {
      R.renderSlide(off, slideForRender(state.slides[i], i), state.format);
      var dataUrl = off.toDataURL("image/jpeg", 0.92);
      pages.push(atob(dataUrl.split(",")[1]));
    }
    var blob = buildPdf(pages, dim.w, dim.h);
    saveBlob(blob, fileBase() + ".pdf");
    toast("PDF downloaded.");
  }

  // Minimal PDF writer: each page is the full-bleed JPEG. Builds the xref by
  // tracking byte offsets into a Latin1 string, then emits a Blob.
  function buildPdf(jpegs, w, h) {
    var objs = []; // object body strings (without "N 0 obj"/"endobj")
    function add(body) {
      objs.push(body);
      return objs.length; // 1-based object number
    }
    var catalog = add(""); // placeholder, filled after pages id known
    var pagesId = add("");
    var kids = [];
    for (var i = 0; i < jpegs.length; i++) {
      var img = jpegs[i];
      var imgId = add(
        "<< /Type /XObject /Subtype /Image /Width " + w + " /Height " + h +
          " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
          img.length + " >>\nstream\n" + img + "\nendstream"
      );
      var content = "q\n" + w + " 0 0 " + h + " 0 0 cm\n/Im0 Do\nQ";
      var contentId = add("<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream");
      var pageId = add(
        "<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 " + w + " " + h + "]" +
          " /Resources << /XObject << /Im0 " + imgId + " 0 R >> >> /Contents " + contentId + " 0 R >>"
      );
      kids.push(pageId + " 0 R");
    }
    objs[catalog - 1] = "<< /Type /Catalog /Pages " + pagesId + " 0 R >>";
    objs[pagesId - 1] = "<< /Type /Pages /Count " + kids.length + " /Kids [" + kids.join(" ") + "] >>";

    var out = "%PDF-1.4\n";
    var offsets = [];
    for (var n = 0; n < objs.length; n++) {
      offsets.push(out.length);
      out += n + 1 + " 0 obj\n" + objs[n] + "\nendobj\n";
    }
    var xrefPos = out.length;
    out += "xref\n0 " + (objs.length + 1) + "\n";
    out += "0000000000 65535 f \n";
    for (var k = 0; k < offsets.length; k++) {
      out += pad10(offsets[k]) + " 00000 n \n";
    }
    out +=
      "trailer\n<< /Size " + (objs.length + 1) + " /Root " + catalog + " 0 R >>\nstartxref\n" +
      xrefPos + "\n%%EOF";

    var bytes = new Uint8Array(out.length);
    for (var b = 0; b < out.length; b++) bytes[b] = out.charCodeAt(b) & 0xff;
    return new Blob([bytes], { type: "application/pdf" });
  }

  // ---- utilities -----------------------------------------------------------
  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = el("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1500);
  }
  function fileBase() {
    return (state.title || "carousel").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "carousel";
  }
  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }
  function pad10(n) {
    var s = "" + n;
    while (s.length < 10) s = "0" + s;
    return s;
  }
  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }
  function sleep(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }
  function autoGrow(ta) {
    function grow() {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
    ta.addEventListener("input", grow);
    setTimeout(grow, 0);
  }

  // ---- settings ------------------------------------------------------------
  function openSettings() {
    $("#apiKey").value = AI.getKey();
    $("#modelSel").value = AI.getModel();
    $("#settingsModal").hidden = false;
  }

  // ---- wire global controls ------------------------------------------------
  function wire() {
    // stepper clicks
    $all(".step").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = b.getAttribute("data-step");
        if (state.reached[s]) go(s);
      });
    });
    // data-goto buttons
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-goto]");
      if (t) {
        var dest = t.getAttribute("data-goto");
        // require a generated deck before leaving topic
        if (!state.slides.length && dest !== "topic") {
          toast("Generate a carousel first.");
          return;
        }
        go(dest);
      }
    });

    $("#dlAll").addEventListener("click", downloadAll);
    $("#dlPdf").addEventListener("click", downloadPdf);
    $("#copyCaption").addEventListener("click", function () {
      navigator.clipboard &&
        navigator.clipboard.writeText($("#captionText").value).then(function () {
          toast("Caption copied.");
        });
    });

    // editor modal
    $("#editorText").addEventListener("input", refreshEditorPreview);
    $("#editorCancel").addEventListener("click", closeEditor);
    $("#editorSave").addEventListener("click", function () {
      if (editingIndex < 0) return;
      state.slides[editingIndex].text = $("#editorText").value;
      closeEditor();
      renderReviewStep();
    });
    $("#editorRegen").addEventListener("click", async function () {
      if (editingIndex < 0) return;
      var btn = this;
      btn.disabled = true;
      btn.textContent = "…";
      try {
        var text = await AI.regenerateSlide({
          title: state.title,
          context: state.context,
          mode: state.mode,
          kind: state.slides[editingIndex].kind,
          current: $("#editorText").value,
          instruction: $("#editorInstruction").value.trim(),
        });
        $("#editorText").value = text;
        refreshEditorPreview();
      } catch (err) {
        toast(err.message || "Couldn't regenerate.");
      } finally {
        btn.disabled = false;
        btn.textContent = "↻ Regenerate";
      }
    });

    // settings modal
    $("#settingsBtn").addEventListener("click", openSettings);
    $("#settingsCancel").addEventListener("click", function () {
      $("#settingsModal").hidden = true;
    });
    $("#settingsSave").addEventListener("click", function () {
      AI.setKey($("#apiKey").value);
      AI.setModel($("#modelSel").value);
      $("#settingsModal").hidden = true;
      updateKeynote();
      toast(AI.hasKey() ? "Key saved." : "Key cleared — using offline writer.");
    });

    // close modals on backdrop click
    $all(".modal").forEach(function (m) {
      m.addEventListener("click", function (e) {
        if (e.target === m) m.hidden = true;
      });
    });
  }

  // ---- boot ----------------------------------------------------------------
  initTopic();
  wire();
  go("topic");
})();
