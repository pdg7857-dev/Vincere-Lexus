/* ============================================================================
   Phil Dave — interaction & animation layer
   - Lenis smooth scroll + GSAP ScrollTrigger reveals
   - Pedestal turntable, glowing hotspots, cinematic room "warp" transitions
   - Magnetic buttons, custom cursor, film particles
   - Reduced-motion + mobile fallbacks
   Content comes from window.SITE (js/data.js) — don't edit copy here.
   ========================================================================== */
(function () {
  "use strict";

  var S = window.SITE || {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); };

  /* ===================== the garage (bays) ============================== */
  // Each bay = a hero scene + ONE section of the site. You enter a bay to
  // see that information; the other sections stay hidden.
  var garage = (S.bays && S.bays.length) ? S.bays
    : (S.heroImage ? [{
        key: "hero", bay: "", label: "", car: "", section: "", type: "photo",
        image: S.heroImage, srcset: S.heroImageSrcset || "",
        alt: "Luxury car presented on a lit studio podium",
        pins: [{ x: 27, y: 56 }, { x: 53, y: 30 }, { x: 81, y: 44 }, { x: 54, y: 70 }],
        door: null,
      }] : null);
  var bayIndex = 0, baySwapping = false;

  function bayFor(sectionId) {
    if (!garage) return -1;
    for (var i = 0; i < garage.length; i++) if (garage[i].section === sectionId) return i;
    return -1;
  }

  // dress the stage for a bay: photo, platinum illustration, or the empty
  // "reserved" pedestal with a ghost silhouette
  function applyBay(room) {
    var stageEl = $("#stage"), img = $("#carImg");
    var isPhoto = room.type !== "illustration" && room.type !== "ghost";
    stageEl.classList.toggle("stage--photo", isPhoto);
    stageEl.classList.toggle("stage--ghost", room.type === "ghost");
    // bays with a model (or spin3d) run the live Three.js turntable wherever
    // WebGL works — the photo never shows there; it stays purely a fallback
    window.__bayCurrent = room;
    window.__baySpin3d = !!(room.spin3d || room.model);
    if (window.HERO3D) window.HERO3D.sync();
    if (isPhoto) {
      if (room.srcset) {
        img.srcset = room.srcset;
        img.sizes = "(max-width: 860px) 96vw, 1100px";
      } else { img.removeAttribute("srcset"); }
      img.src = room.image;
      img.alt = room.alt || "Luxury car on a studio podium";
    } else {
      img.removeAttribute("srcset"); img.removeAttribute("sizes");
      img.src = "assets/car.svg";
      img.alt = room.type === "ghost"
        ? "Empty lit pedestal, reserved for your car"
        : "Platinum car illustration on a lit pedestal";
    }
  }

  function setBayLabel(room) {
    var n = $("#bayNum"), t = $("#bayTitle");
    if (n) n.textContent = room.bay || "";
    if (t) t.textContent = room.car || room.label || "";
  }

  function placeDoor() {
    var doorEl = $(".hotspot--door");
    var room = garage[bayIndex];
    if (!doorEl || !room.door) return;
    doorEl.style.left = room.door.x + "%";
    doorEl.style.top = room.door.y + "%";
    doorEl.classList.toggle("hotspot--flip", room.door.x > 55);
    var nxt = garage[(bayIndex + 1) % garage.length];
    doorEl.querySelector("b").textContent = "Next: " + (nxt.bay || "the next bay");
    doorEl.querySelector(".hotspot__label span").textContent = nxt.label || "";
    doorEl.setAttribute("aria-label", "Walk through to " + (nxt.bay || "the next bay") + ", " + (nxt.label || ""));
  }

  function movePins(room) {
    $$(".hotspot--bay").forEach(function (el, i) {
      var p = (room.pins || [])[i];
      if (p) { el.style.left = p.x + "%"; el.style.top = p.y + "%"; }
      el.classList.toggle("is-here", i === bayIndex);
    });
    placeDoor();
  }

  // show only the entered bay's section of the site
  function gateSections() {
    if (!garage) return;
    garage.forEach(function (room, i) {
      var sec = document.getElementById(room.section);
      if (!sec) return;
      sec.classList.add("room--gated");
      var open = i === bayIndex;
      sec.classList.toggle("is-open", open);
      if (!open) sec.__revealed = false; // re-entering a bay replays its entrance
    });
    if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
  }

  function updateBayUI() {
    $$("#dots .dot").forEach(function (d) {
      d.classList.toggle("is-active", d.getAttribute("data-bay") == String(bayIndex));
    });
    $$(".baytab").forEach(function (t, i) {
      var here = i === bayIndex;
      t.classList.toggle("is-active", here);
      var cta = t.querySelector(".baytab__cta");
      if (cta) cta.textContent = here ? "You are here" : "Enter bay ›";
    });
  }

  // reveal a section's content (sections live hidden, so scroll-triggered
  // reveals can't be trusted — stagger everything in when the bay opens)
  function revealSection(sec) {
    if (sec.__revealed) return;
    sec.__revealed = true;
    var items = $$(".will-reveal, .reveal-line", sec);
    if (!items.length) return;
    if (!hasGSAP || reduce) { items.forEach(function (el) { el.classList.add("in"); el.style.opacity = 1; el.style.transform = "none"; }); return; }
    gsap.fromTo(items, { opacity: 0, y: 26 }, {
      opacity: 1, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.06, overwrite: "auto",
      onComplete: function () { items.forEach(function (el) { el.classList.add("in"); }); }
    });
    // safety net: whatever happens to the tween (interrupted scroll, tab
    // switch, odd mobile browsers), nothing may stay faded out
    setTimeout(function () {
      items.forEach(function (el) {
        if (+getComputedStyle(el).opacity < 0.99) {
          el.classList.add("in"); el.style.opacity = 1; el.style.transform = "none";
        }
      });
    }, 2200);
  }

  /* ---------- sticky "explore the next bay" teaser ---------------------- */
  // shows the NEXT bay's car slowly spinning in a little porthole; the
  // fallback photo sits behind the canvas until the model streams in
  var miniMod = null, miniReady = false;
  function nextRoom() { return garage[(bayIndex + 1) % garage.length]; }
  function updateNextBay() {
    var nb = $("#nextBay");
    if (!nb || !garage || garage.length < 2) return;
    var nxt = nextRoom();
    $("#nextBayName").textContent = (nxt.bay ? nxt.bay + " · " : "") + (nxt.label || nxt.car || "");
    var mount = $("#nextBaySpin");
    // photo thumb behind the canvas (smallest srcset entry)
    var thumb = (nxt.srcset || "").split(",")[0].trim().split(" ")[0] || nxt.image || "";
    if (thumb) mount.style.backgroundImage =
      "radial-gradient(70% 90% at 50% 30%, rgba(201,204,209,.14), transparent 65%), url('" + thumb + "')";
    if (reduce || !miniReady || !nxt.model) return;
    (miniMod ? Promise.resolve(miniMod) : import("./minispin.js?v=17").then(function (m) { miniMod = m; return m; }))
      .then(function (m) { return m.show(mount, nxt); })
      .catch(function () { /* no WebGL / fetch failed → photo thumb stays */ });
  }
  function initNextBay() {
    var nb = $("#nextBay");
    if (!nb || !garage || garage.length < 2) return;
    nb.hidden = false;
    nb.addEventListener("click", function () { enterBay(bayIndex + 1); });
    updateNextBay();                 // name + photo immediately
    // let the hero's own model win the bandwidth race, then go live
    setTimeout(function () { miniReady = true; updateNextBay(); }, 4500);
  }

  /* enter a bay: cinematic pull-through on the hero, swap the visible
     section, then glide down to the information */
  // phones stay where they are (you watch the car change on the stage);
  // only desktop glides down to the text. Nav-menu links force the glide
  // on every device because there the destination IS the text.
  function wantsGlide(opts) {
    if (opts.scroll === false) return false;
    if (opts.scroll === "force") return true;
    return window.matchMedia("(min-width: 821px)").matches;
  }
  function enterBay(next, opts) {
    opts = opts || {};
    if (!garage || baySwapping) return;
    next = (next + garage.length) % garage.length;
    var room = garage[next];
    var sec = document.getElementById(room.section);

    // already here → just glide down to the info
    if (next === bayIndex) {
      if (sec) { scrollToId(room.section); revealSection(sec); }
      return;
    }

    var heroVisible = window.scrollY < window.innerHeight * 0.7;
    var stageZoom = $("#stage");
    var door = garage[bayIndex].door || { x: 85, y: 25 };

    function commit() {
      bayIndex = next;
      applyBay(room);
      setBayLabel(room);
      movePins(room);
      gateSections();
      updateBayUI();
      updateNextBay();
    }

    if (reduce || !hasGSAP || !heroVisible) {
      // away from the hero (or calm mode): swap instantly, then glide
      commit();
      if (sec) {
        if (wantsGlide(opts)) scrollToId(room.section);
        setTimeout(function () { revealSection(sec); }, 350);
      }
      return;
    }

    baySwapping = true;
    var pins = $$(".hotspot");
    gsap.timeline({ onComplete: function () { baySwapping = false; } })
      .to(pins, { opacity: 0, scale: 0.5, duration: 0.22, stagger: 0.02, ease: "power1.in" }, 0)
      .add(function () { gsap.set(stageZoom, { transformOrigin: door.x + "% " + door.y + "%" }); }, 0)
      .to(stageZoom, { scale: 2.5, filter: "blur(16px) brightness(0.25)", duration: 0.65, ease: "power2.in" }, 0)
      .set("#warp", { opacity: 1 }, 0.45)
      .fromTo(".warp__core", { scale: 1, opacity: 1 }, { scale: 70, duration: 0.35, ease: "power2.in" }, 0.45)
      .add(commit)
      .set(stageZoom, { transformOrigin: "50% 50%", scale: 0.7, filter: "blur(12px) brightness(0.2)" })
      .to(".warp__core", { opacity: 0, duration: 0.3 })
      .set("#warp", { opacity: 0 })
      .to(stageZoom, { scale: 1, filter: "blur(0px) brightness(1)", duration: 1.0, ease: "power3.out" }, "-=0.25")
      .to(pins, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: "back.out(1.6)" }, "-=0.5")
      .add(function () {
        if (sec) {
          if (wantsGlide(opts)) scrollToId(room.section);
          setTimeout(function () { revealSection(sec); }, 400);
        }
      }, "-=0.55");
  }

  /* ===================== content injection ============================= */
  function fillText(attr, value) {
    $$("[" + attr + "]").forEach(function (el) { el.textContent = value; });
  }

  function buildContent() {
    // brand strings
    if (S.tagline) { fillText("data-tagline", S.tagline); }
    if (S.region) { fillText("data-region", S.region); }
    var em = $("[data-tagline-em]");
    // derive the emphasised word from tagline if possible (keeps hero in sync)
    if (em && S.tagline) {
      var m = S.tagline.replace(/[.!]$/, "").split(/[ ,]+/).pop();
      if (m) em.textContent = m.toLowerCase();
    }
    var yr = $("#year"); if (yr) yr.textContent = "2026";

    // 3D model attribution (Creative Commons requirement)
    var mc = $("#modelCredit");
    var credits = S.modelCredits || (S.modelCredit && S.modelCredit.text ? [S.modelCredit] : []);
    if (mc && credits.length) {
      mc.hidden = false;
      mc.innerHTML = "3D models: " + credits.map(function (c) {
        return '<a href="' + esc(c.url || "#") + '" target="_blank" rel="noopener">' + esc(c.text) + "</a>" +
          (c.license ? " (" + esc(c.license) + ")" : "");
      }).join(" · ");
    }

    // the garage — dress the stage for Bay 01 and pre-warm the others
    if (garage) {
      var img = $("#carImg");
      applyBay(garage[0]);
      img.setAttribute("fetchpriority", "high");
      img.decoding = "async";
      garage.slice(1).forEach(function (r) {
        if (!r.image) return;
        var pre = new Image();
        if (r.srcset) { pre.srcset = r.srcset; pre.sizes = "(max-width: 860px) 96vw, 1100px"; }
        pre.src = r.image;
      });
      if (garage.length > 1) { $("#stageBay").hidden = false; setBayLabel(garage[0]); }
      gateSections();
    }

    // the bay buttons — four clear, always-labelled pins over the car
    // ("About Me — Enter Bay 01"), plus the chevron door to the next bay
    var hs = $("#hotspots");
    (garage || []).forEach(function (room, i) {
      var p = (garage[0].pins || [])[i] || { x: 25 + i * 18, y: 40 };
      var btn = document.createElement("button");
      btn.className = "hotspot hotspot--bay magnetic" + (i === 0 ? " is-here" : "");
      btn.type = "button";
      btn.style.left = p.x + "%";
      btn.style.top = p.y + "%";
      btn.setAttribute("data-bay", i);
      btn.setAttribute("aria-label", room.label + ", enter " + room.bay);
      btn.innerHTML =
        '<span class="hotspot__dot" aria-hidden="true"></span>' +
        '<span class="hotspot__label"><b>' + esc(room.label) + "</b><span>Enter " + esc(room.bay) + "</span></span>";
      btn.addEventListener("click", function () { enterBay(i); });
      hs.appendChild(btn);
    });

    if (garage && garage.length > 1) {
      var doorBtn = document.createElement("button");
      doorBtn.className = "hotspot hotspot--door magnetic";
      doorBtn.type = "button";
      doorBtn.innerHTML =
        '<span class="hotspot__dot" aria-hidden="true">&rsaquo;</span>' +
        '<span class="hotspot__label"><b></b><span></span></span>';
      doorBtn.addEventListener("click", function () { enterBay(bayIndex + 1); });
      hs.appendChild(doorBtn);
      placeDoor();

      // the bay navigator strip + edge arrows — the unmissable way through
      var navEl = $("#bayNav"), tabs = $("#bayTabs");
      if (navEl && tabs) {
        navEl.hidden = false;
        // the tabs are the invitation now — retire the scroll cue
        var cue = $(".hero__scrollcue");
        if (cue) cue.style.display = "none";
        $("#bayCount").textContent = garage.length;
        tabs.innerHTML = garage.map(function (room, i) {
          return (
            '<button class="baytab' + (i === 0 ? " is-active" : "") + '" type="button" data-bay="' + i + '" aria-label="' + esc(room.bay + " — " + room.label) + '">' +
              '<span class="baytab__num">' + esc(String(i + 1).padStart(2, "0")) + "</span>" +
              '<span class="baytab__name">' + esc(room.label) + "</span>" +
              '<span class="baytab__cta"></span>' +
            "</button>"
          );
        }).join("");
        tabs.querySelectorAll(".baytab").forEach(function (t) {
          t.addEventListener("click", function () { enterBay(+t.getAttribute("data-bay")); });
        });
      }
      var prev = $("#bayPrev"), nxt = $("#bayNext");
      if (prev && nxt) {
        prev.hidden = nxt.hidden = false;
        prev.addEventListener("click", function () { enterBay(bayIndex - 1); });
        nxt.addEventListener("click", function () { enterBay(bayIndex + 1); });
      }
      // arrow keys walk the garage while the hero is on screen
      document.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var t = e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
        if (window.scrollY > window.innerHeight * 0.7) return;
        enterBay(bayIndex + (e.key === "ArrowRight" ? 1 : -1));
      });
      updateBayUI();
      initNextBay();
    }

    // marques banner + la collection
    buildBrands();
    buildInventory();

    // process
    var pl = $("#processList");
    pl.innerHTML = (S.process || []).map(function (s) {
      return (
        '<li class="step will-reveal">' +
          '<div class="step__num">' + esc(s.step) + "</div>" +
          "<div><h3 class=\"step__title\">" + esc(s.title) + "</h3>" +
          '<p class="step__body">' + esc(s.body) + "</p></div>" +
        "</li>"
      );
    }).join("");

    // about (+ portrait)
    if (S.about) {
      $("#aboutLead").textContent = S.about.lead || "";
      $("#aboutBody").innerHTML = (S.about.body || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
      var ph = $("#aboutPhoto");
      if (ph && S.about.photo) {
        ph.innerHTML =
          '<img src="' + esc(S.about.photo) + '"' +
          (S.about.photoSrcset ? ' srcset="' + esc(S.about.photoSrcset) + '" sizes="(max-width: 860px) 86vw, 380px"' : "") +
          ' alt="' + esc(S.about.photoAlt || "Portrait") + '" loading="lazy" decoding="async" />' +
          (S.about.photoCaption ? '<figcaption>' + esc(S.about.photoCaption) + "</figcaption>" : "");
      } else if (ph) { ph.style.display = "none"; }
    }
    $("#aboutStats").innerHTML = (S.stats || []).map(function (s) {
      return '<div class="stat"><div class="stat__value">' + esc(s.value) + '</div><div class="stat__label">' + esc(s.label) + "</div></div>";
    }).join("");

    // quotes
    $("#quotes").innerHTML = (S.testimonials || []).map(function (q) {
      return (
        '<figure class="quote will-reveal">' +
          '<div class="quote__mark" aria-hidden="true">&ldquo;</div>' +
          '<blockquote class="quote__text">' + esc(q.quote) + "</blockquote>" +
          '<figcaption class="quote__author">' + esc(q.author) + "</figcaption>" +
        "</figure>"
      );
    }).join("");

    // FAQ accordion
    var faqList = $("#faqList");
    if (faqList) {
      faqList.innerHTML = (S.faq || []).map(function (f, i) {
        return (
          '<div class="faq__item will-reveal">' +
            '<button class="faq__q" type="button" aria-expanded="false" aria-controls="faqa' + i + '">' +
              "<span>" + esc(f.q) + "</span><i class=\"faq__icon\" aria-hidden=\"true\"></i>" +
            "</button>" +
            '<div class="faq__a" id="faqa' + i + '" role="region"><p>' + esc(f.a) + "</p></div>" +
          "</div>"
        );
      }).join("");
      faqList.querySelectorAll(".faq__q").forEach(function (q) {
        q.addEventListener("click", function () {
          var open = q.getAttribute("aria-expanded") === "true";
          // close siblings for a clean single-open accordion
          faqList.querySelectorAll(".faq__q").forEach(function (o) {
            o.setAttribute("aria-expanded", "false");
            o.parentNode.classList.remove("is-open");
          });
          if (!open) { q.setAttribute("aria-expanded", "true"); q.parentNode.classList.add("is-open"); }
        });
      });
    }

    // direct contact
    var c = S.contact || {};
    var items = [];
    if (c.phone) items.push('<li><a href="tel:' + esc(c.phone.replace(/[^+\d]/g, "")) + '"><span class="direct__k">Phone</span><span class="direct__v">' + esc(c.phone) + "</span></a></li>");
    if (c.email) items.push('<li><a href="mailto:' + esc(c.email) + '"><span class="direct__k">Email</span><span class="direct__v">' + esc(c.email) + "</span></a></li>");
    if (c.instagram) items.push('<li><a href="' + esc(c.instagramUrl || "#") + '" target="_blank" rel="noopener"><span class="direct__k">Instagram</span><span class="direct__v">' + esc(c.instagram) + "</span></a></li>");
    $("#directList").innerHTML = items.join("");
  }

  /* ===================== marques logo marquees ========================== */
  // one strip of official logos, duplicated for a seamless auto-scroll loop
  function buildBrands() {
    var label = $("#brandsLabel");
    if (label) label.textContent = S.brandsLabel || "Brands I source";
    var strip = (S.brands || []).map(function (b) {
      return (
        '<img class="brandimg" src="assets/marques/' + esc(b.key) + '.webp" alt="' +
        esc(b.title) + '" title="' + esc(b.title) + '" loading="lazy" decoding="async" />'
      );
    }).join("");
    // 4 copies so the 50% translate loop never runs dry on wide screens
    var loop = strip + strip + strip + strip;
    ["#brandsTrack", "#marqueeTrack"].forEach(function (sel) {
      var track = $(sel);
      if (track) track.innerHTML = loop;
    });
  }

  /* ===================== la collection ================================= */
  // status → css key (statuses read in French; classes stay stable)
  var STATUS_KEYS = {
    "disponible": "available", "available": "available",
    "réservée": "sourced", "reservee": "sourced", "sourced": "sourced",
    "vendue": "sold", "sold": "sold"
  };
  function statusKey(s) { return STATUS_KEYS[String(s || "").toLowerCase()] || "available"; }

  function carMedia(c) {
    if (c.image) {
      return '<img src="' + esc(c.image) + '" alt="' + esc(c.year + " " + c.make + " " + c.model) + '" loading="lazy" />';
    }
    var silo = window.SILHOUETTES && (window.SILHOUETTES[c.body] || window.SILHOUETTES.sedan);
    return '<div class="card__art">' + (silo ? silo() : "") +
      '<span class="card__marque">' + esc(c.make) + "</span></div>";
  }

  function cardHTML(c, i) {
    var key = statusKey(c.status);
    return (
      '<article class="card will-reveal" data-i="' + i + '" tabindex="0" role="button" aria-label="' + esc(c.year + " " + c.make + " " + c.model) + ', view details">' +
        '<span class="status status--' + key + '">' + esc(c.status || "Available") + "</span>" +
        '<div class="card__media">' + carMedia(c) + "</div>" +
        '<div class="card__body">' +
          '<span class="card__year">' + esc(c.year) + " · " + esc(c.make) + "</span>" +
          '<h3 class="card__name">' + esc(c.model) + "</h3>" +
          '<p class="card__note">' + esc(c.note || "") + "</p>" +
          '<span class="card__more">View details &rsaquo;</span>' +
        "</div>" +
      "</article>"
    );
  }

  function buildInventory() {
    var grid = $("#inventoryGrid");
    var inv = S.inventory || [];
    if (!inv.length) {
      grid.innerHTML = '<div class="empty">Nouveautés en route — new arrivals incoming.</div>';
    } else {
      grid.innerHTML = inv.map(cardHTML).join("");
      // card → lightbox
      grid.querySelectorAll(".card").forEach(function (card) {
        card.addEventListener("click", function () { openSheet(inv[+card.getAttribute("data-i")]); });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(inv[+card.getAttribute("data-i")]); }
        });
      });
    }
    // the private-collection invitation
    var cta = S.inventoryCta || {};
    if ($("#privCta")) {
      $("#privLead").textContent = cta.lead || "";
      $("#privBody").textContent = cta.body || "";
      $("#privBtn").textContent = cta.button || "Request a car";
    }
  }

  /* ===================== vehicle lightbox ============================== */
  var sheetEl, lastFocus, spinMod = null;
  function startSheetSpin(c) {
    // live turntable over the still — only when the card ships a model and
    // the device is happy to animate; the still stays put on any failure
    var media = $("#sheetMedia");
    media.setAttribute("data-spin-for", c.spinModel || "");
    if (!c.spinModel || reduce) return;
    (spinMod ? Promise.resolve(spinMod) : import("./sheetspin.js?v=17").then(function (m) { spinMod = m; return m; }))
      .then(function (m) { return m.start(media, c); })
      .catch(function () { /* no WebGL / fetch failed → still image remains */ });
  }
  function sheetSpecs(c) {
    var box = $("#sheetSpecs");
    if (!box) return;
    var rows = c.specs || [];
    box.hidden = !rows.length;
    box.innerHTML = rows.map(function (r) {
      return '<div class="spec"><span class="spec__label">' + esc(r.label) + '</span><span class="spec__value">' + esc(r.value) + "</span></div>";
    }).join("");
    var story = $("#sheetStory");
    if (!story) return;
    var paras = c.story || [];
    story.hidden = !paras.length;
    story.innerHTML = (paras.length ? '<h4 class="sheet__storytitle">The story</h4>' : "") +
      paras.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  }
  function openSheet(c) {
    if (!c) return;
    sheetEl = sheetEl || $("#sheet");
    lastFocus = document.activeElement;
    if (spinMod) spinMod.stop();
    $("#sheetMedia").innerHTML = carMedia(c);
    var st = (c.status || "Available");
    var sS = $("#sheetStatus"); sS.textContent = st; sS.className = "sheet__status status status--" + statusKey(st);
    $("#sheetYear").textContent = c.year + " · " + c.make;
    $("#sheetName").textContent = c.model;
    $("#sheetNote").textContent = c.note || "";
    sheetSpecs(c);
    startSheetSpin(c);
    sheetEl.classList.add("is-open");
    sheetEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    if (lenis) lenis.stop();
    if (hasGSAP && !reduce) {
      gsap.fromTo(".sheet__panel", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" });
      gsap.fromTo(".sheet__backdrop", { opacity: 0 }, { opacity: 1, duration: 0.4 });
    }
    $(".sheet__close").focus();
  }
  function closeSheet() {
    if (!sheetEl) return;
    if (spinMod) spinMod.stop();
    sheetEl.classList.remove("is-open");
    sheetEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  }
  function initSheet() {
    var s = $("#sheet");
    if (!s) return;
    $$("[data-sheet-close]", s).forEach(function (el) { el.addEventListener("click", closeSheet); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && s.classList.contains("is-open")) closeSheet(); });
    // CTA inside sheet: close then warp to contact
    var cta = $("#sheetCta");
    if (cta) cta.addEventListener("click", function (e) { e.preventDefault(); closeSheet(); setTimeout(function () { warpTo("contact"); }, 80); });
  }

  /* ===================== side bay navigator ============================ */
  function initDots() {
    var wrap = $("#dots");
    if (!wrap || !garage) return;
    wrap.innerHTML = garage.map(function (room, i) {
      return '<button class="dot' + (i === 0 ? " is-active" : "") + '" type="button" data-bay="' + i + '" aria-label="' + esc(room.bay + " — " + room.label) + '"><span class="dot__label">' + esc(room.bay + " · " + room.label) + "</span></button>";
    }).join("");
    wrap.querySelectorAll(".dot").forEach(function (d) {
      d.addEventListener("click", function () { enterBay(+d.getAttribute("data-bay")); });
    });
  }

  /* ===================== particles (film dust) ========================= */
  function buildParticles() {
    if (reduce) return;
    var box = $("#particles");
    if (!box) return;
    var n = window.innerWidth < 700 ? 14 : 30;
    for (var i = 0; i < n; i++) {
      var d = document.createElement("span");
      d.className = "particle";
      box.appendChild(d);
      if (hasGSAP) {
        gsap.set(d, { x: (i / n) * window.innerWidth + Math.sin(i) * 40, y: Math.random ? 0 : 0 });
        var startY = (i * 37) % window.innerHeight;
        gsap.set(d, { left: ((i * 53) % 100) + "%", top: startY + "px" });
        gsap.to(d, {
          opacity: 0.5, duration: 2 + (i % 5), repeat: -1, yoyo: true, delay: (i % 7) * 0.3, ease: "sine.inOut"
        });
        gsap.to(d, {
          y: "+=" + (40 + (i % 5) * 30), x: "+=" + ((i % 2 ? 1 : -1) * (20 + (i % 4) * 10)),
          duration: 9 + (i % 6), repeat: -1, yoyo: true, ease: "sine.inOut", delay: (i % 5) * 0.4
        });
      }
    }
  }

  /* ===================== custom cursor ================================= */
  function initCursor() {
    if (reduce || coarse) return;
    var cur = $(".cursor");
    if (!cur || !hasGSAP) return;
    var ring = $(".cursor__ring"), dot = $(".cursor__dot");
    var rx = gsap.quickTo(ring, "x", { duration: 0.4, ease: "power3" });
    var ry = gsap.quickTo(ring, "y", { duration: 0.4, ease: "power3" });
    var dx = gsap.quickTo(dot, "x", { duration: 0.1, ease: "power3" });
    var dy = gsap.quickTo(dot, "y", { duration: 0.1, ease: "power3" });
    window.addEventListener("mousemove", function (e) {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    });
    document.addEventListener("mouseleave", function () { cur.classList.add("is-hidden"); });
    document.addEventListener("mouseenter", function () { cur.classList.remove("is-hidden"); });
    $$("a, button, .hotspot, input, select, textarea").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cur.classList.add("is-hover"); });
      el.addEventListener("mouseleave", function () { cur.classList.remove("is-hover"); });
    });
  }

  /* ===================== magnetic buttons ============================== */
  function initMagnetic() {
    if (reduce || coarse || !hasGSAP) return;
    $$(".magnetic").forEach(function (el) {
      var qx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
      var qy = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        qx(mx * 0.35); qy(my * 0.35);
      });
      el.addEventListener("mouseleave", function () { qx(0); qy(0); });
    });
  }

  /* ===================== smooth scroll (Lenis) ========================= */
  var lenis = null;
  function initLenis() {
    if (reduce || typeof Lenis === "undefined") return;
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, lerp: 0.09 });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -10, duration: 1.3 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }

  /* ===================== navigation routing ============================ */
  // Every in-page link routes through the garage: section links enter their
  // bay (cinematic pull-through + reveal); anything else glides.
  function warpTo(id) {
    closeMenu();
    var b = bayFor(id);
    if (b >= 0) { enterBay(b, { scroll: "force" }); return; }
    scrollToId(id);
  }

  /* ===================== reveals & scroll motion ======================= */
  function initReveals() {
    if (!hasGSAP || !window.ScrollTrigger) {
      $$(".will-reveal").forEach(function (el) { el.classList.add("in"); el.style.opacity = 1; el.style.transform = "none"; });
      return;
    }
    // line masks — only for always-visible chrome (hero, banner); gated
    // sections reveal via revealSection when their bay opens
    $$(".reveal-line").forEach(function (line) {
      if (line.closest(".room--gated")) return;
      gsap.from(line, {
        yPercent: 110, opacity: 0, duration: 1.1, ease: "power4.out",
        scrollTrigger: { trigger: line, start: "top 92%" }
      });
    });
    // the open bay's section reveals when it first scrolls into view
    $$(".room--gated").forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: "top 78%",
        onEnter: function () { revealSection(sec); }
      });
    });
    // any non-gated will-reveal blocks
    $$(".will-reveal").forEach(function (el) {
      if (el.closest(".room--gated")) return;
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" }
      });
    });
    // subtle parallax on the hero stage as you leave it
    gsap.to("#stage", {
      yPercent: -12, opacity: 0.25, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero__copy", {
      yPercent: -40, opacity: 0, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "60% top", scrub: true }
    });
  }

  /* ===================== pedestal turntable ============================ */
  function initTurntable() {
    if (reduce || !hasGSAP) return;
    // rotate the dashed pedestal rings like a turntable
    gsap.to(".stage__ring--2", { rotation: 360, duration: 60, repeat: -1, ease: "none", transformOrigin: "50% 50%" });
    gsap.to(".stage__disc", { rotation: -360, duration: 90, repeat: -1, ease: "none", transformOrigin: "50% 50%" });
    // gentle "breathing" float of the car
    gsap.to("#stageCar", { y: "-=10", duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut" });

    // the display turntable — a slow, constant 3D sway of the whole scene,
    // as if the podium is quietly turning under the studio lights
    gsap.set("#carImg", { transformPerspective: 950, transformOrigin: "50% 72%" });
    gsap.fromTo("#carImg", { rotationY: -6.5 }, {
      rotationY: 6.5, duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true
    });

    // periodic studio-light sweep across the car (CSS light bar overlay,
    // since the car is an <img> of an SVG and can't be reached into)
    var sc = $("#stageCar");
    if (sc) {
      var bar = document.createElement("span");
      bar.className = "lightsweep";
      sc.appendChild(bar);
      gsap.set(bar, { xPercent: -140, opacity: 0 });
      var st = gsap.timeline({ repeat: -1, repeatDelay: 5 });
      st.to(bar, { opacity: 1, duration: 0.4 })
        .to(bar, { xPercent: 140, duration: 1.5, ease: "power1.inOut" }, 0)
        .to(bar, { opacity: 0, duration: 0.4 }, 1.1)
        .set(bar, { xPercent: -140 });
    }

    // mouse-parallax tilt on the whole stage (desktop)
    if (!coarse) {
      var stage = $("#stage");
      stage.addEventListener("mousemove", function (e) {
        var r = stage.getBoundingClientRect();
        var nx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var ny = (e.clientY - (r.top + r.height / 2)) / r.height;
        gsap.to("#stageCar", { rotationY: nx * 4, rotationX: -ny * 3, duration: 0.8, ease: "power3", transformPerspective: 800 });
      });
      stage.addEventListener("mouseleave", function () {
        gsap.to("#stageCar", { rotationY: 0, rotationX: 0, duration: 1.2, ease: "power3" });
      });
    }
  }

  /* The 3D turntable hero lives in js/hero3d.js (module) — it swaps the 2D
     stage for a real-time Three.js showroom on capable desktops and leaves
     this 2D version in place everywhere else. */

  /* ===================== nav + links =================================== */
  function closeMenu() {
    var nav = $("#nav"), btn = $("#navMenu");
    nav.classList.remove("is-open");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }
  function initNav() {
    var nav = $("#nav"), btn = $("#navMenu");
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // sticky styling
    if (hasGSAP && window.ScrollTrigger) {
      ScrollTrigger.create({
        start: "top -80",
        onUpdate: function (self) { nav.classList.toggle("is-stuck", self.scroll() > 80); }
      });
    } else {
      window.addEventListener("scroll", function () { nav.classList.toggle("is-stuck", window.scrollY > 80); });
    }
    // intercept in-page links → warp transition
    $$("[data-link]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").replace("#", "");
        if (document.getElementById(id)) { e.preventDefault(); warpTo(id); }
      });
    });
    // (bay pins and the door bind their own clicks at creation)
  }

  /* ===================== lead form ===================================== */
  function initForm() {
    var form = $("#leadForm");
    if (!form) return;
    var statusEl = $("#leadStatus"), submit = $("#leadSubmit");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusEl.className = "lead__status";
      statusEl.textContent = "";

      // validation
      var ok = true;
      ["name", "contact", "vehicle"].forEach(function (n) {
        var f = form.elements[n];
        if (!f.value.trim()) { f.classList.add("invalid"); ok = false; }
        else f.classList.remove("invalid");
      });
      if (!ok) { statusEl.className = "lead__status err"; statusEl.textContent = "Please complete the required fields."; return; }

      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name) data[el.name] = el.value.trim();
      });

      submit.disabled = true;
      var prev = submit.textContent;
      submit.textContent = "Sending…";

      function done(success, msg) {
        submit.disabled = false; submit.textContent = prev;
        statusEl.className = "lead__status " + (success ? "ok" : "err");
        statusEl.textContent = msg;
        if (success) form.reset();
      }

      // Real submission if an endpoint is configured…
      if (S.formEndpoint) {
        fetch(S.formEndpoint, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (r.ok) done(true, "Thank you — your request is in. I'll be in touch personally.");
          else done(false, "Something went wrong. Please email me directly.");
        }).catch(function () { done(false, "Network error. Please email me directly."); });
        return;
      }

      // …otherwise DEMO mode: log + offer a mailto fallback.
      console.log("[Phil Dave lead — DEMO mode, set SITE.formEndpoint to go live]", data);
      var to = (S.contact && S.contact.email) || "";
      if (to) {
        var subject = encodeURIComponent("Car request — " + (data.vehicle || ""));
        var body = encodeURIComponent(
          "Name: " + data.name + "\nContact: " + data.contact + "\nVehicle: " + data.vehicle +
          "\nBudget: " + (data.budget || "-") + "\nTimeline: " + (data.timeline || "-") +
          "\nBest time: " + (data.besttime || "-") + "\n\nNotes:\n" + (data.notes || ""));
        window.location.href = "mailto:" + to + "?subject=" + subject + "&body=" + body;
      }
      done(true, "Opening your email to send the request. (Tip: connect a form endpoint to receive these automatically.)");
    });
  }

  /* ===================== intro / boot ================================== */
  /* the opening: the car waits in a dark garage, then the studio lights
     stutter awake (HID-style) and bloom over the podium */
  function runIntro(then) {
    var intro = $("#intro"), bar = $(".intro__bar span");
    function finish() {
      document.body.classList.remove("is-loading");
      intro.classList.add("is-done");
      then && then();
    }
    if (reduce || !hasGSAP) { finish(); return; }

    // before the overlay lifts: kill the lights
    gsap.set("#stage", { filter: "brightness(0.05)" });
    gsap.set(".hero__spot", { opacity: 0 });
    gsap.set(".hotspot", { opacity: 0, scale: 0 });
    gsap.set(".baynav", { opacity: 0 });

    var tl = gsap.timeline();
    tl.to(bar, { width: "100%", duration: 1.0, ease: "power2.inOut", delay: 0.25 })
      .add(finish)
      // a beat in the dark — the silhouette on the podium
      .to({}, { duration: 0.9 })
      // the lamps stutter awake…
      .to("#stage", { filter: "brightness(0.55)", duration: 0.07 })
      .to("#stage", { filter: "brightness(0.08)", duration: 0.09 })
      .to("#stage", { filter: "brightness(0.7)", duration: 0.07, delay: 0.14 })
      .to("#stage", { filter: "brightness(0.18)", duration: 0.08 })
      // …then bloom to full
      .to("#stage", { filter: "brightness(1)", duration: 1.1, ease: "power2.out" })
      .to(".hero__spot", { opacity: 1, duration: 1.3, ease: "power2.out" }, "<")
      .to(".baynav", { opacity: 1, duration: 0.8 }, "-=0.7")
      .to(".hotspot", { opacity: 1, scale: 1, stagger: 0.08, duration: 0.5, ease: "back.out(2)" }, "-=0.6")
      // hand the filter back untouched so bay transitions own it from here
      .set("#stage", { clearProps: "filter" });
  }

  /* ===================== init ========================================== */
  function init() {
    buildContent();
    initNav();
    initDots();
    initSheet();
    initForm();
    initLenis();
    initReveals();
    initMagnetic();
    initCursor();
    buildParticles();
    initTurntable();
    runIntro(function () { if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
