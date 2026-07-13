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
  // shows the NEXT bay's car in a still three quarter pose in a little
  // porthole (no photos behind it, so cars never overlap old images)
  var miniMod = null, miniReady = false;
  function nextRoom() { return garage[(bayIndex + 1) % garage.length]; }
  function updateNextBay() {
    var nb = $("#nextBay");
    if (!nb || !garage || garage.length < 2) return;
    var nxt = nextRoom();
    $("#nextBayName").textContent = (nxt.bay ? nxt.bay + " · " : "") + (nxt.label || nxt.car || "");
    var mount = $("#nextBaySpin");
    if (!nxt.model) {
      // bays without a car (the Vault) get the plain gradient, never a
      // leftover frame of the previous bay's car
      mount.setAttribute("data-mini-for", "");
      var cv = mount.querySelector("canvas");
      if (cv) cv.classList.remove("is-live");
      return;
    }
    if (!miniReady) return;
    (miniMod ? Promise.resolve(miniMod) : import("./minispin.js?v=15").then(function (m) { miniMod = m; return m; }))
      .then(function (m) { return m.show(mount, nxt); })
      .catch(function () { /* no WebGL / fetch failed → photo thumb stays */ });
  }
  function initNextBay() {
    var nb = $("#nextBay");
    if (!nb || !garage || garage.length < 2) return;
    nb.addEventListener("click", function () { enterBay(bayIndex + 1); });
    updateNextBay();                 // name + photo immediately
    // let the hero's own model win the bandwidth race, then go live
    setTimeout(function () { miniReady = true; updateNextBay(); }, 4500);
    // Only reveal the teaser once you've scrolled past the hero — otherwise it
    // floats over the bay tabs and blocks them (badly so on mobile).
    function toggleNB() { nb.hidden = window.scrollY < window.innerHeight * 0.6; }
    toggleNB();
    window.addEventListener("scroll", toggleNB, { passive: true });
    window.addEventListener("resize", toggleNB);
  }

  /* enter a bay: cinematic pull-through on the hero, swap the visible
     section, then glide down to the information */
  // phones stay where they are (you watch the car change on the stage);
  // only desktop glides down to the text. Nav-menu links force the glide
  // on every device because there the destination IS the text.
  function wantsGlide(opts) {
    if (opts.scroll === "force") return true;
    // Switching bays keeps you where you are on the hero (desktop & mobile);
    // only an explicit navigation (warpTo, nav links, CTAs) glides to a section.
    return false;
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

    // (the labelled pins and the chevron door that used to float over the
    // car are gone — the tab strip, edge arrows and the sticky next-bay
    // teaser carry all navigation now, so the car stays unobstructed)

    if (garage && garage.length > 1) {
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
    buildNewsletter();
    buildOmvic();
    buildNews();
    buildWhatsApp();
    loadLexusTool();

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
    if ($("#statsKicker")) $("#statsKicker").textContent = S.statsKicker || "";
    $("#aboutStats").innerHTML = (S.stats || []).map(function (s) {
      return '<div class="stat"><div class="stat__value">' + esc(s.value) + '</div><div class="stat__label">' + esc(s.label) + "</div></div>";
    }).join("");

    // quotes (removed from the page for now — guard in case the element is absent)
    var quotesEl = $("#quotes");
    if (quotesEl) quotesEl.innerHTML = (S.testimonials || []).map(function (q) {
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
      if (b.word) return '<span class="brandword">' + esc(b.word) + '</span>';
      var src = b.logo || ("assets/marques/" + esc(b.key) + ".webp");
      return (
        '<img class="brandimg" src="' + esc(src) + '" alt="' +
        esc(b.title) + '" title="' + esc(b.title) + '" loading="lazy" decoding="async" />'
      );
    }).join("");
    // repeat enough that the 50% translate loop never runs dry on wide screens
    var loop = ""; for (var i = 0; i < 8; i++) loop += strip;
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
          '<div class="card__foot">' +
            '<span class="card__more">View details &rsaquo;</span>' +
            '<button type="button" class="card__inquire" data-i="' + i + '">Inquire about this car</button>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function buildInventory() {
    var grid = $("#inventoryGrid");
    var inv = S.inventory || [];
    if (!inv.length) {
      grid.innerHTML = '<div class="empty">Nouveautés en route. New arrivals incoming.</div>';
    } else {
      grid.innerHTML = inv.map(cardHTML).join("");
      // card → lightbox
      grid.querySelectorAll(".card").forEach(function (card) {
        card.addEventListener("click", function () { openSheet(inv[+card.getAttribute("data-i")]); });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(inv[+card.getAttribute("data-i")]); }
        });
      });
      // "Inquire about this car" → jump to the request form, prefilled with the car
      grid.querySelectorAll(".card__inquire").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();                       // don't also open the detail sheet
          var c = inv[+btn.getAttribute("data-i")];
          var vf = document.querySelector('#leadForm [name="vehicle"]');
          if (vf && c) vf.value = c.year + " " + c.make + " " + c.model;
          warpTo("contact");
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

  /* ---------- newsletter (bottom of every bay) -------------------------- */
  function buildNewsletter() {
    var cfg = S.newsletter;
    if (!cfg || !garage) return;
    garage.forEach(function (room) {
      var sec = document.getElementById(room.section);
      if (!sec) return;
      var wrap = document.createElement("div");
      wrap.className = "newsletter will-reveal";
      wrap.innerHTML =
        '<div class="newsletter__head">' +
          '<span class="newsletter__kicker">' + esc(cfg.kicker || "") + "</span>" +
          '<h3 class="newsletter__title">' + esc(cfg.title || "") + "</h3>" +
          '<p class="newsletter__body">' + esc(cfg.body || "") + "</p>" +
        "</div>" +
        '<form class="newsletter__form" novalidate>' +
          '<input name="name" type="text" placeholder="Name" autocomplete="name" required />' +
          '<input name="phone" type="tel" placeholder="Number" autocomplete="tel" required />' +
          '<input name="email" type="email" placeholder="Email" autocomplete="email" required />' +
          '<input name="city" type="text" placeholder="City" autocomplete="address-level2" required />' +
          '<button class="btn btn--primary" type="submit">' + esc(cfg.button || "Subscribe") + "</button>" +
          '<p class="newsletter__done" hidden>You are on the list. Watch your inbox.</p>' +
        "</form>";
      sec.appendChild(wrap);
      var form = wrap.querySelector("form");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = { source: "newsletter" };
        ["name", "phone", "email", "city"].forEach(function (k) { data[k] = form.elements[k].value.trim(); });
        if (!data.name || !data.email || data.email.indexOf("@") < 0) {
          form.classList.add("is-error");
          return;
        }
        form.classList.remove("is-error");
        function ok() {
          $$("input, button", form).forEach(function (el) { el.style.display = "none"; });
          form.querySelector(".newsletter__done").hidden = false;
          // remember the subscription locally (it is the key to Bay 05)
          try { localStorage.setItem("pd_subscribed", JSON.stringify({ email: data.email, name: data.name, t: Date.now() })); } catch (err) {}
          document.dispatchEvent(new CustomEvent("pd:subscribed"));
        }
        if (cfg.endpoint) {
          fetch(cfg.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(data),
          }).then(ok).catch(ok);
        } else {
          console.log("[newsletter demo]", data);
          ok();
        }
      });
    });
  }

  /* ---------- floating WhatsApp "send me a text" bubble ---------------- */
  // Web-Audio notification chime (a soft tri-tone, synthesised so it needs no
  // asset and respects the CSP). Primed on the first user gesture so autoplay
  // policies let it sound when the pop-up appears.
  var waCtx = null, waAudioReady = false;
  function primeAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!waCtx) waCtx = new AC();
      if (waCtx.state === "suspended") waCtx.resume();
      waAudioReady = true;
    } catch (e) {}
  }
  function playDing() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!waCtx) waCtx = new AC();
      if (waCtx.state === "suspended") waCtx.resume();
      var t0 = waCtx.currentTime;
      // three quick bell notes — an iPhone-ish tri-tone
      [[0, 1244.5], [0.12, 1661.2], [0.24, 1108.7]].forEach(function (n) {
        var osc = waCtx.createOscillator(), g = waCtx.createGain();
        osc.type = "triangle"; osc.frequency.value = n[1];
        var t = t0 + n[0];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        osc.connect(g); g.connect(waCtx.destination);
        osc.start(t); osc.stop(t + 0.45);
      });
    } catch (e) {}
  }

  function buildWhatsApp() {
    var cfg = S.whatsapp || {}, el = $("#waBubble"), chat = $("#waChat");
    if (!el) return;
    var num = (cfg.number || "").replace(/[^0-9]/g, "");
    if (!num && !chat) { el.remove(); var pp0 = $("#waPop"); if (pp0) pp0.remove(); return; }
    var waHref = num ? ("https://wa.me/" + num + "?text=" + encodeURIComponent(cfg.text || "Hi, I'd like to ask about a car.")) : "";
    var lab = $("#waBubbleLabel"); if (lab) lab.textContent = cfg.label || "Send me a text";
    el.hidden = false;

    // prime audio on the first interaction so the chime can play later
    var primeOnce = function () { primeAudio(); ["pointerdown", "keydown", "touchstart", "scroll"].forEach(function (ev) { window.removeEventListener(ev, primeOnce); }); };
    ["pointerdown", "keydown", "touchstart", "scroll"].forEach(function (ev) { window.addEventListener(ev, primeOnce, { passive: true }); });

    /* ---------------- in-page chat funnel ---------------- */
    var log = $("#waChatLog"), quickEl = $("#waChatQuick"), form = $("#waChatForm"), input = $("#waChatText"), closeBtn = $("#waChatClose");
    var started = false, state = "start", lead = {};
    var CLOSING = "Perfect — I'm dropping this into WhatsApp so I've got the full picture. Tap send and I'll get right back to you 👇";
    var OPT_LEXUS = "I'm looking to get a Lexus", OPT_OTHER = "I'm looking for another make", OPT_QUESTION = "I just have a question";
    var LEXUS_MODELS = ["ES", "IS", "LS", "NX", "RX", "GX", "LX", "RZ", "LC", "RC", "Not sure yet"];

    function addMsg(who, text) {
      if (!log) return;
      var row = document.createElement("div"); row.className = "wachat__msg wachat__msg--" + who;
      var bub = document.createElement("span"); bub.className = "wachat__bubble"; bub.textContent = text;
      row.appendChild(bub); log.appendChild(row); log.scrollTop = log.scrollHeight;
    }
    function setQuick(labels) {
      if (!quickEl) return;
      quickEl.innerHTML = "";
      (labels || []).forEach(function (l) {
        var b = document.createElement("button"); b.type = "button"; b.className = "wachat__chip"; b.textContent = l;
        b.addEventListener("click", function () { advance(l); });
        quickEl.appendChild(b);
      });
      quickEl.hidden = !labels || !labels.length;
    }
    function bot(text, after) { setTimeout(function () { addMsg("bot", text); if (after) after(); }, 480); }
    function greet() { bot(cfg.popup || "Hey 👋 how can I help?", function () { state = "start"; setQuick([OPT_LEXUS, OPT_OTHER, OPT_QUESTION]); }); }
    function askCondition() { state = "condition"; bot("New or used?", function () { setQuick(["New", "Used"]); }); }
    function askModel() { state = "model"; bot("Which model?", function () { setQuick(LEXUS_MODELS); }); }
    function askTrade() { state = "tradeask"; bot("Do you have a trade-in?", function () { setQuick(["Yes", "No"]); }); }
    function askTradeDetails() { state = "tradedetails"; bot("Nice — what are you driving? Year, make, model and rough km."); }

    // build the WhatsApp message that carries the whole funnel to Phil
    function composeWA() {
      var lines = ["Hi Phil, coming from your site 👋", ""];
      if (lead.interest) lines.push(lead.interest);
      if (lead.condition) lines.push("New or used: " + lead.condition);
      if (lead.model) lines.push("Model: " + lead.model);
      if (lead.make) lines.push("After: " + lead.make);
      if (lead.question) lines.push("Question: " + lead.question);
      if (lead.custom) lines.push(lead.custom);
      if (lead.tradein) lines.push("Trade-in: " + lead.tradein + (lead.tradeDetails ? " (" + lead.tradeDetails + ")" : ""));
      return lines.join("\n");
    }
    function openWA() {
      if (!num) return "";
      var url = "https://wa.me/" + num + "?text=" + encodeURIComponent(composeWA());
      try { window.open(url, "_blank"); } catch (e) {}
      return url;
    }
    // called synchronously inside the click/submit handler so the WhatsApp
    // tab opens as a user gesture (not blocked by pop-up policies)
    function finish() {
      state = "done";
      var url = openWA();
      try { logActivity("chat", "handoff to WhatsApp", composeWA().replace(/\n+/g, " | ")); } catch (e) {}
      bot(CLOSING, function () {
        if (url && quickEl) {
          quickEl.innerHTML = "";
          var b = document.createElement("button"); b.type = "button"; b.className = "wachat__chip"; b.textContent = "Open WhatsApp";
          b.addEventListener("click", openWA);
          quickEl.appendChild(b); quickEl.hidden = false;
        }
      });
    }

    // advance the funnel from a quick-reply OR a typed message
    function advance(text) {
      addMsg("user", text);
      try { logActivity("chat", text, "step:" + state); } catch (e) {}
      setQuick([]);
      switch (state) {
        case "start":
          if (text === OPT_LEXUS) { lead.interest = "Looking to buy a Lexus"; askCondition(); }
          else if (text === OPT_OTHER) { lead.interest = "Looking for another make"; state = "othermake"; bot("Which make and model are you after?"); }
          else if (text === OPT_QUESTION) { lead.interest = "Has a question"; state = "question"; bot("Sure — what's your question?"); }
          else { lead.custom = text; finish(); }        // a custom opening message
          break;
        case "condition": lead.condition = text; askModel(); break;
        case "model": lead.model = text; askTrade(); break;        // ask trade-in when buying
        case "othermake": lead.make = text; askTrade(); break;      // ask trade-in when buying
        case "tradeask": lead.tradein = text; if (/^y/i.test(text)) askTradeDetails(); else finish(); break;
        case "tradedetails": lead.tradeDetails = text; finish(); break;
        case "question": lead.question = text; finish(); break;
        // state "done": extra messages are just logged
      }
    }

    function openChat() {
      var pp = $("#waPop"); if (pp) { pp.classList.remove("is-in"); pp.hidden = true; }
      if (!chat) { if (waHref) window.open(waHref, "_blank", "noopener"); return; }
      chat.hidden = false; requestAnimationFrame(function () { chat.classList.add("is-in"); });
      document.body.classList.add("wachat-open");
      if (!started) { started = true; greet(); try { logActivity("chat", "chat opened"); } catch (e) {} }
      setTimeout(function () { if (input) input.focus(); }, 320);
    }
    function closeChat() { if (!chat) return; chat.classList.remove("is-in"); document.body.classList.remove("wachat-open"); setTimeout(function () { chat.hidden = true; }, 250); }

    if (closeBtn) closeBtn.addEventListener("click", closeChat);
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); var t = (input.value || "").trim(); if (!t) return; input.value = ""; advance(t); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && chat && !chat.hidden) closeChat(); });
    el.addEventListener("click", function (e) { e.preventDefault(); openChat(); });

    /* ---------------- 30s pop-up teaser (opens the chat) ---------------- */
    var pop = $("#waPop"), popMsg = $("#waPopMsg"), popClose = $("#waPopClose");
    if (!pop || !cfg.popup) return;
    popMsg.textContent = cfg.popup;
    var dismissed = false;
    try { dismissed = sessionStorage.getItem("pd_wapop") === "1"; } catch (e) {}
    function hidePop(remember) { pop.classList.remove("is-in"); pop.hidden = true; if (remember) { try { sessionStorage.setItem("pd_wapop", "1"); } catch (e) {} } }
    if (popClose) popClose.addEventListener("click", function (e) { e.stopPropagation(); hidePop(true); });
    pop.addEventListener("click", function () { hidePop(true); openChat(); });
    if (!dismissed) {
      var delay = ((cfg.popupDelaySeconds != null ? cfg.popupDelaySeconds : 30) * 1000);
      setTimeout(function () {
        if (dismissed || !pop || document.hidden || (chat && !chat.hidden)) return;
        pop.hidden = false;
        requestAnimationFrame(function () { pop.classList.add("is-in"); });
        if (cfg.popupSound !== false) playDing();
        try { logActivity("whatsapp", "pop-up shown"); } catch (e) {}
      }, delay);
    }
  }

  /* ---------- Bay 06 · Registered & Licensed --------------------------- */
  function buildOmvic() {
    var cfg = S.omvic; if (!cfg) return;
    var badgesHTML = (cfg.badges || []).map(function (b) {
      return '<div class="omvic__badge will-reveal"><h4>' + esc(b.title) + "</h4><p>" + esc(b.text) + "</p>" +
        (b.ref ? '<span class="omvic__ref">' + esc(b.ref) + "</span>" : "") + "</div>";
    }).join("");
    // the credentials render in two places: the About bay and the contact trust strip
    [
      { lead: "#omvicLead", body: "#omvicBody", note: "#omvicNote", box: "#omvicBadges" },
      { lead: "#aboutLicenseLead", body: null, note: "#aboutLicenseNote", box: "#aboutLicenseBadges" }
    ].forEach(function (sel) {
      var lead = $(sel.lead); if (lead) lead.textContent = cfg.lead || "";
      var body = sel.body && $(sel.body); if (body) body.textContent = cfg.body || "";
      var note = $(sel.note); if (note) note.textContent = cfg.note || "";
      var box = $(sel.box); if (box) box.innerHTML = badgesHTML;
    });
  }

  /* ---------- Bay 07 · Automotive News --------------------------------- */
  function buildNews() {
    var cfg = S.news; if (!cfg) return;
    var lead = $("#newsLead"); if (lead) lead.textContent = cfg.lead || "";
    var body = $("#newsBody"); if (body) body.textContent = cfg.body || "";
    var list = $("#newsList"); if (!list) return;
    list.innerHTML = (cfg.posts || []).map(function (p) {
      var d = "";
      if (p.date) { var parts = p.date.split("-"); var mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; d = (mo[(+parts[1] || 1) - 1] || "") + " " + (+parts[2] || "") + ", " + parts[0]; }
      return '<article class="news__post will-reveal">' +
        '<div class="news__meta">' + (p.tag ? '<span class="news__tag">' + esc(p.tag) + "</span>" : "") +
          (d ? '<span class="news__date">' + esc(d) + "</span>" : "") + "</div>" +
        '<h3 class="news__title">' + esc(p.title || "") + "</h3>" +
        '<p class="news__excerpt">' + esc(p.body || "") + "</p>" +
        (p.link ? '<a class="news__more" href="' + esc(p.link) + '" target="_blank" rel="noopener">Read more ›</a>' : "") +
        "</article>";
    }).join("");
  }


  /* ---------- Bay 05 · Lexus tool, inlined via shadow DOM -------------- */
  // The tool is a full standalone page (its own 240KB CSS with universal
  // resets + .card/.btn rules that would wreck this page if inlined raw).
  // We mount it in a shadow root: its CSS is injected UNCHANGED and stays
  // fully isolated both ways, while its handful of `document` queries are
  // redirected into the shadow root so it runs as real in-page DOM — one
  // document, one scroll, no iframe, no boxed container.
  // the tool calls this when a model is selected; we lazy-load the turntable
  // module and spin that model inside its section (or clear it if no model)
  var lexSpin = null;
  window.__pdLexusSpin = function (id, sectionEl) {
    if (reduce || !sectionEl) return;
    (lexSpin ? Promise.resolve(lexSpin) : import("./lexusspin.js?v=15").then(function (m) { lexSpin = m; return m; }))
      .then(function (m) {
        if (!m.has(id)) { m.stop(); return; }
        var box = sectionEl.querySelector(".pd-spin");
        if (!box) {
          box = (sectionEl.ownerDocument || document).createElement("div");
          box.className = "pd-spin";
          box.innerHTML = '<span class="pd-spin__cap">3D preview · drag-free turntable</span>';
          sectionEl.insertBefore(box, sectionEl.firstChild);
        }
        m.show(id, box);
      })
      .catch(function () {});
  };

  function loadLexusTool() {
    var mount = $("#lexusMount");
    if (!mount || mount.__loaded) return;
    mount.__loaded = true;
    fetch("lexus-2026.html?v=15").then(function (r) { return r.text(); }).then(function (txt) {
      var doc = new DOMParser().parseFromString(txt, "text/html");
      // drop the tool's own standalone hero + footer so it starts at the UI
      var hero = doc.querySelector("header.hero"); if (hero) hero.parentNode.removeChild(hero);
      Array.prototype.forEach.call(doc.querySelectorAll("body > footer, .site-footer"), function (f) { f.parentNode.removeChild(f); });
      // collect css (map the page-level selectors onto the shadow host so
      // the tool's body/root styling still applies inside the shadow)
      var css = Array.prototype.map.call(doc.querySelectorAll("style"), function (s) { return s.textContent; }).join("\n")
        .replace(/:root/g, ":host")
        .replace(/(^|[}{,])\s*html\s*,\s*body\b/g, "$1 :host")
        .replace(/(^|[}{,])\s*(?:html|body)\b(?=\s*[,{])/g, "$1 :host");
      // collect scripts, then strip scripts + styles from the markup
      var code = Array.prototype.map.call(doc.querySelectorAll("script"), function (s) { return s.textContent; }).join("\n;\n");
      Array.prototype.forEach.call(doc.querySelectorAll("script, style"), function (n) { n.parentNode.removeChild(n); });
      var markup = doc.body.innerHTML;
      // build the shadow tree
      var shadow = mount.attachShadow({ mode: "open" });
      shadow.innerHTML = "<style>:host{display:block}</style><style>" + css + "</style>" + markup;
      // redirect the tool's document queries into the shadow root, and run
      // its DOMContentLoaded handlers immediately (the page already loaded)
      code = code
        .replace(/document\.getElementById\(/g, "__SRGET__(")
        .replace(/document\.querySelectorAll\(/g, "__SR__.querySelectorAll(")
        .replace(/document\.querySelector\(/g, "__SR__.querySelector(")
        .replace(/document\.addEventListener\(\s*["']DOMContentLoaded["']\s*,\s*([\w$]+)\s*\)/g, "($1)()");
      code = 'var __SRGET__=function(id){return __SR__.querySelector("#"+(window.CSS&&CSS.escape?CSS.escape(id):id))};\n' + code;
      try { new Function("__SR__", "window", "document", code)(shadow, window, document); }
      catch (e) { if (window.console) console.error("Lexus tool init failed", e); }
    }).catch(function (e) { if (window.console) console.error("Lexus tool load failed", e); });
  }

  /* ---------- Bay 08 · The Lot member gate ----------------------------- */
  // open for anyone who subscribed on this device, or whose email the
  // membership endpoint (Google Sheet via Apps Script) recognises
  // JSONP call (Apps Script GET can't be read cross-origin any other way)
  function jsonp(url, cb) {
    var name = "__pdcb" + Date.now() + Math.floor(Math.random() * 1e6);
    var s = document.createElement("script");
    var timer = setTimeout(function () { cleanup(); cb(null); }, 9000);
    function cleanup() { clearTimeout(timer); try { delete window[name]; } catch (e) { window[name] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
    window[name] = function (data) { cleanup(); cb(data); };
    s.onerror = function () { cleanup(); cb(null); };
    s.src = url + (url.indexOf("?") < 0 ? "?" : "&") + "callback=" + name;
    document.head.appendChild(s);
  }
  var digits = function (v) { return String(v == null ? "" : v).replace(/\D/g, ""); };

  // any successful lead capture makes the visitor a member of The Lot
  function markMember(email, phone, name) {
    try {
      if (email) localStorage.setItem("pd_member", String(email).toLowerCase());
      localStorage.setItem("pd_subscribed", JSON.stringify({ email: email || "", phone: phone || "", name: name || "", t: Date.now() }));
    } catch (e) {}
    document.dispatchEvent(new Event("pd:subscribed"));
  }
  // who we currently know the visitor to be (from any lead form or Lot unlock)
  function identity() {
    var id = { email: "", phone: "", name: "" };
    try {
      var s = JSON.parse(localStorage.getItem("pd_subscribed") || "null");
      if (s) { id.email = s.email || ""; id.phone = s.phone || ""; id.name = s.name || ""; }
      if (!id.email) { var m = localStorage.getItem("pd_member") || ""; if (m.indexOf("@") > 0) id.email = m; else if (m) id.phone = m; }
    } catch (e) {}
    return id;
  }
  function userKey() { var id = identity(); return id.email || id.phone || ""; }
  // stable anonymous id so open-lot browsing (clicks, searches, filters) can be
  // grouped per visitor even before they identify themselves.
  var ANON = (function () {
    try { var a = localStorage.getItem("pd_anon"); if (!a) { a = "anon-" + Math.random().toString(36).slice(2, 10); localStorage.setItem("pd_anon", a); } return a; }
    catch (e) { return "anon"; }
  })();
  function trackKey() { return userKey() || ANON; }

  /* ---------- per-user activity log (Activity tab of the sheet) --------- */
  var SESSION = { id: (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)), start: Date.now(), ended: false };
  function logActivity(event, detail, value) {
    var user = trackKey();
    if (!S.formEndpoint) return;
    var payload = { kind: "activity", user: user, identified: (userKey() ? "yes" : "no"), event: event, detail: detail || "", value: (value == null ? "" : value), session: SESSION.id, captured_at: new Date().toISOString() };
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(S.formEndpoint, new Blob([body], { type: "text/plain;charset=utf-8" }));
      else fetch(S.formEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body }).catch(function () {});
    } catch (e) {}
  }
  /* ---------- analytics + site performance (one row per visit) --------- */
  var pageviewLogged = false;
  function logPageview() {
    if (pageviewLogged || !S.formEndpoint) return;
    pageviewLogged = true;
    var loadMs = 0, domMs = 0;
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if (nav) { loadMs = Math.round(nav.loadEventEnd - nav.startTime); domMs = Math.round(nav.domContentLoadedEventEnd - nav.startTime); }
      else if (performance.timing) { var t = performance.timing; loadMs = t.loadEventEnd - t.navigationStart; domMs = t.domContentLoadedEventEnd - t.navigationStart; }
    } catch (e) {}
    var conn = "";
    try { conn = (navigator.connection && navigator.connection.effectiveType) || ""; } catch (e) {}
    var detail = [
      "ref:" + (document.referrer || "direct"),
      "path:" + location.pathname,
      "screen:" + screen.width + "x" + screen.height,
      "vp:" + window.innerWidth + "x" + window.innerHeight,
      "dpr:" + (window.devicePixelRatio || 1),
      conn ? "net:" + conn : "",
      "lang:" + (navigator.language || "")
    ].filter(Boolean).join(" | ");
    logActivity("pageview", detail, "load " + (loadMs > 0 ? loadMs : "?") + "ms / dom " + (domMs > 0 ? domMs : "?") + "ms");
  }
  if (document.readyState === "complete") setTimeout(logPageview, 300);
  else window.addEventListener("load", function () { setTimeout(logPageview, 300); });

  function endSession() {
    if (SESSION.ended) return;
    SESSION.ended = true;
    logActivity("session", "session length", Math.round((Date.now() - SESSION.start) / 1000) + "s");
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") endSession(); });
  window.addEventListener("pagehide", endSession);

  function initVault() {
    // Lexus edition: The Lot is open to everyone — no sign-up wall.
    var content = $("#vaultContent");
    if (!content) return;
    content.hidden = false;
    // the finder sits beside the highlights (right column); the lot fills the width below
    buildLot($("#finderMount") || content, content);
  }

  /* ---------- The Lot: full used inventory (lazy grid + filters) -------- */
  var lotBuilt = false;
  function buildLot(quizMount, lotMount) {
    if (lotBuilt) return;
    lotBuilt = true;
    fetch("js/lot.json?v=19")
      .then(function (r) { return r.json(); })
      .then(function (cars) { cars = cars || []; if (cars.length) renderLot(quizMount, lotMount, cars); })
      .catch(function () { /* keep the placeholder if the feed can't load */ });
  }
  function money(n) { return "$" + Number(n).toLocaleString("en-US"); }

  /* ---------- The Lot: the guided vehicle finder (questionnaire) --------
     A few tap-only questions, then we score every car on the lot and show
     just the ones that fit — with the full filterable lot as a fallback. */
  var QUIZ = [
    { key: "body", q: "What kind of vehicle are you after?", opts: [
        { v: "SUV", label: "SUV / crossover" },
        { v: "Sedan", label: "Sedan" },
        { v: "Coupe", label: "Coupe / sports" },
        { v: "Van", label: "Van / people-mover" },
        { v: "", label: "No preference" } ] },
    { key: "cond", q: "New or pre-owned?", opts: [
        { v: "new", label: "New / nearly new" },
        { v: "cpo", label: "Certified pre-owned" },
        { v: "used", label: "Pre-owned" },
        { v: "", label: "No preference" } ] },
    { key: "budget", q: "What's your budget?", opts: [
        { v: "b1", label: "Under $40,000" },
        { v: "b2", label: "$40,000 – $70,000" },
        { v: "b3", label: "$70,000 – $100,000" },
        { v: "b4", label: "$100,000 +" },
        { v: "", label: "No preference" } ] },
    { key: "make", q: "Which brand?", opts: [
        { v: "Lexus", label: "Lexus" },
        { v: "", label: "Open to any make" } ] },
    { key: "priority", q: "What matters most?", opts: [
        { v: "family", label: "Space for the family" },
        { v: "hybrid", label: "Fuel efficiency / hybrid" },
        { v: "awd", label: "All-weather grip" },
        { v: "performance", label: "Performance" },
        { v: "value", label: "Best value" } ] },
  ];

  function renderLot(quizMount, lotMount, cars) {
    var makes = ["All makes"].concat(Object.keys(cars.reduce(function (a, c) { a[c.make] = 1; return a; }, {})).sort());
    quizMount.innerHTML =
      '<div class="lotquiz" id="lotQuiz">' +
        '<div id="lotQuizBody"></div>' +
      '</div>';
    lotMount.innerHTML =
      '<div class="lotresult" id="lotResult" hidden></div>' +
      '<div class="lotbrowse" id="lotBrowse">' +
        '<div class="lotbrowse__lead" id="lotBrowseLead">Or browse the whole lot</div>' +
        '<div class="lotbar">' +
          '<div class="lotfilters">' +
            '<div class="lotcond" id="lotCond" role="group" aria-label="Filter by condition">' +
              '<button type="button" class="lotcond__btn is-active" data-cond="all">All</button>' +
              '<button type="button" class="lotcond__btn" data-cond="new">New</button>' +
              '<button type="button" class="lotcond__btn" data-cond="cpo">Certified pre-owned</button>' +
              '<button type="button" class="lotcond__btn" data-cond="used">Used</button>' +
              '<button type="button" class="lotcond__btn lotcond__btn--rare" data-cond="rare">Rare finds</button>' +
            '</div>' +
            '<span class="lotfilters__div" aria-hidden="true"></span>' +
            '<button type="button" class="lotcond__btn" id="lotNonLexus" aria-pressed="false">Non-Lexus</button>' +
          '</div>' +
          '<div class="lotbar__row">' +
            '<span class="lot__count" id="lotCount"></span>' +
            '<div class="lot__controls">' +
              '<input type="search" id="lotSearch" placeholder="Search model, trim, colour…" aria-label="Search the lot" />' +
              '<select id="lotMake" aria-label="Filter by make">' + makes.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join("") + '</select>' +
              '<select id="lotSort" aria-label="Sort">' +
                '<option value="year-desc">Newest first</option>' +
                '<option value="price-asc">Price: low to high</option>' +
                '<option value="price-desc">Price: high to low</option>' +
                '<option value="km-asc">Kilometres: lowest</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="lotgrid" id="lotGrid"></div>' +
        '<p class="lot__empty" id="lotEmpty" hidden>No cars match. Widen your search.</p>' +
      '</div>';

    var quizEl = $("#lotQuiz", quizMount), quizBody = $("#lotQuizBody", quizMount);
    var resultEl = $("#lotResult", lotMount), browseEl = $("#lotBrowse", lotMount), leadEl = $("#lotBrowseLead", lotMount);
    var grid = $("#lotGrid", lotMount), countEl = $("#lotCount", lotMount), emptyEl = $("#lotEmpty", lotMount);
    var matchMode = false;   // true while the grid is showing the finder's matches
    var searchEl = $("#lotSearch", lotMount), makeEl = $("#lotMake", lotMount), sortEl = $("#lotSort", lotMount), condEl = $("#lotCond", lotMount), nonLexEl = $("#lotNonLexus", lotMount);
    var cond = "all";   // active condition, driven by the button group
    var nonLexus = false;   // "Non-Lexus" quick toggle
    // "New" = essentially delivery-mileage stock; "Used" is everything else and includes CPO.
    function isNew(c) { return c.km != null && c.km <= 1000; }
    // "Rare finds" — the genuinely special cars that stand out on the lot:
    // exotic/premium-sport marques, halo performance trims, and flagship Lexus.
    function isRare(c) {
      var mk = c.make || "";
      var t = " " + ((c.trim || "") + " " + (c.model || "")).toLowerCase() + " ";
      if (/porsche|land rover|jaguar|maserati|bentley|aston|lamborghini|ferrari|mclaren|alfa romeo|lotus/i.test(mk)) return true;
      if (/mercedes/i.test(mk) && /amg/i.test(t)) return true;
      if (/bmw/i.test(mk) && /\bm[2345678]\b/.test(t)) return true;
      if (/audi/i.test(mk) && /\brs\s?[0-9]\b/.test(t)) return true;
      if (/lexus/i.test(mk) && /\b(rc\s?f|gs\s?f|is\s?500|lc\s?500|lfa)\b/.test(t)) return true;
      if (/type r|\bsvr\b|trackhawk|hellcat|nismo|\bsti\b|\bgt-?r\b|\bz06\b|shelby/i.test(t)) return true;
      if (/lexus/i.test(mk) && c.price >= 95000) return true;   // flagship LX territory
      return false;
    }

    var currentList = [];

    /* ---- the finder: state machine, scoring, matches ---- */
    var ans = {}, qi = 0;
    function renderQuiz() {
      var Q = QUIZ[qi];
      quizBody.innerHTML =
        '<div class="lotquiz__prog">Question ' + (qi + 1) + ' of ' + QUIZ.length +
          '<span class="lotquiz__track"><i style="width:' + Math.round(qi / QUIZ.length * 100) + '%"></i></span></div>' +
        '<h3 class="lotquiz__q">' + esc(Q.q) + '</h3>' +
        '<div class="lotquiz__opts">' + Q.opts.map(function (o) {
          return '<button type="button" class="lotquiz__opt' + (ans[Q.key] === o.v ? " is-sel" : "") + '" data-v="' + esc(o.v) + '">' + esc(o.label) + '</button>';
        }).join("") + '</div>' +
        '<div class="lotquiz__nav">' +
          (qi > 0 ? '<button type="button" class="lotquiz__back">&lsaquo; Back</button>' : '<span></span>') +
          '<button type="button" class="lotquiz__skip">See the full lot &darr;</button>' +
        '</div>';
    }
    function bucketOf(p) { return p < 40000 ? 0 : p < 70000 ? 1 : p < 100000 ? 2 : 3; }
    var BQ = { b1: 0, b2: 1, b3: 2, b4: 3 };
    function scoreCar(c) {
      var s = 0;
      if (ans.body) s += (c.body === ans.body) ? 45 : -70;
      if (ans.cond === "new") s += isNew(c) ? 30 : -20;
      else if (ans.cond === "cpo") s += c.certified ? 35 : -25;
      else if (ans.cond === "used") s += !isNew(c) ? 15 : -8;
      if (ans.budget && BQ[ans.budget] != null) { var d = Math.abs(bucketOf(c.price) - BQ[ans.budget]); s += d === 0 ? 35 : d === 1 ? 10 : -35; }
      if (ans.make === "Lexus") s += (c.make === "Lexus") ? 25 : -80;
      var eng = (c.engine || "") + " " + (c.trim || "") + " " + (c.model || "");
      if (ans.priority === "family") s += (c.body === "SUV" || c.body === "Van") ? 25 : -8;
      else if (ans.priority === "hybrid") s += /hybrid|electric/i.test((c.fuel || "") + eng) ? 45 : -15;
      else if (ans.priority === "awd") s += /awd|4×4|4x4/i.test(c.drive || "") ? 28 : -10;
      else if (ans.priority === "performance") s += /v6|v8|6 cyl|8 cyl|f sport|\bf\b|amg|\bm[0-9]?\b|\brs\b|type r|\bgt\b/i.test(eng) ? 30 : /4 cyl/i.test(eng) ? -8 : 0;
      else if (ans.priority === "value") s += Math.max(0, 25 - Math.round(c.price / 6000));
      return s;
    }
    function computeMatches() {
      var ranked = cars.map(function (c) { return { c: c, s: scoreCar(c) }; })
        .sort(function (a, b) { return (b.s - a.s) || (b.c.year - a.c.year); });
      var pos = ranked.filter(function (x) { return x.s > 0; });
      // show the genuine matches; only if nothing scores positive, fall back to the closest few
      return (pos.length ? pos : ranked.slice(0, 3)).slice(0, 8).map(function (x) { return x.c; });
    }
    function summaryStr() {
      var parts = [];
      var bl = { SUV: "SUV", Sedan: "Sedan", Coupe: "Coupe / sports", Van: "Van" };
      if (ans.body && bl[ans.body]) parts.push(bl[ans.body]);
      var cl = { "new": "New / nearly new", cpo: "Certified pre-owned", used: "Pre-owned" };
      if (ans.cond && cl[ans.cond]) parts.push(cl[ans.cond]);
      var bg = { b1: "Under $40k", b2: "$40k–$70k", b3: "$70k–$100k", b4: "$100k+" };
      if (ans.budget && bg[ans.budget]) parts.push(bg[ans.budget]);
      if (ans.make === "Lexus") parts.push("Lexus");
      var pr = { family: "Family space", hybrid: "Efficiency", awd: "All-weather", performance: "Performance", value: "Value" };
      if (ans.priority && pr[ans.priority]) parts.push(pr[ans.priority]);
      return parts.join(" · ") || "anything on the lot";
    }
    // leave matched mode and return the grid to the normal filter view
    function exitMatch() { if (!matchMode) return; matchMode = false; resultEl.hidden = true; if (leadEl) leadEl.hidden = false; }
    function finishQuiz() {
      var matches = computeMatches();
      matchMode = true;
      paint(matches);                       // the always-visible grid now shows the matches
      if (leadEl) leadEl.hidden = true;
      var sum = summaryStr();
      resultEl.hidden = false;
      resultEl.innerHTML =
        '<div class="lotresult__in">' +
          '<div class="lotresult__txt"><span class="lotresult__kick">Your matches</span>' +
          '<p class="lotresult__sum"><b>' + matches.length + (matches.length === 1 ? " vehicle" : " vehicles") + '</b> that fit ' + esc(sum) + '</p></div>' +
          '<div class="lotresult__act">' +
            '<button type="button" class="lotresult__btn" id="quizRedo">Start over</button>' +
            '<button type="button" class="lotresult__btn lotresult__btn--ghost" id="quizAll">Show all vehicles &rsaquo;</button>' +
          '</div>' +
        '</div>';
      $("#quizRedo", lotMount).addEventListener("click", startOver);
      $("#quizAll", lotMount).addEventListener("click", showAll);
      logActivity("finder", sum, matches.length + " matches");
      try { resultEl.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
    }
    function startOver() { ans = {}; qi = 0; renderQuiz(); exitMatch(); apply(); try { quizEl.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} }
    function showAll() { exitMatch(); apply(); try { browseEl.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} }
    function scrollToLot() { try { browseEl.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} }
    quizEl.addEventListener("click", function (e) {
      var opt = e.target.closest(".lotquiz__opt");
      if (opt) { var Q = QUIZ[qi]; ans[Q.key] = opt.getAttribute("data-v"); if (qi < QUIZ.length - 1) { qi++; renderQuiz(); } else finishQuiz(); return; }
      if (e.target.closest(".lotquiz__back")) { if (qi > 0) { qi--; renderQuiz(); } return; }
      if (e.target.closest(".lotquiz__skip")) { scrollToLot(); return; }
    });

    function cardHTML(c, i) {
      var name = c.year + " " + c.make + " " + (c.trim || c.model);
      var meta = [c.km ? c.km.toLocaleString("en-US") + " km" : null, c.ext, c.drive].filter(Boolean).join(" · ");
      return '<article class="lotcar" data-idx="' + i + '" tabindex="0" role="button" aria-label="Inquire about ' + esc(name) + '">' +
        '<div class="lotcar__media">' +
          (c.photo ? '<img loading="lazy" decoding="async" src="' + esc(c.photo) + '" alt="' + esc(name) + '" />' : '<div class="lotcar__noimg">' + esc(c.make) + '</div>') +
          (c.certified ? '<span class="lotcar__badge">Lexus Certified</span>' : '') +
        '</div>' +
        '<div class="lotcar__body">' +
          '<span class="lotcar__price">' + money(c.price) + '</span>' +
          '<h4 class="lotcar__name">' + esc(name) + '</h4>' +
          '<p class="lotcar__meta">' + esc(meta) + '</p>' +
          '<div class="lotcar__actions">' +
            (c.url ? '<a class="lotcar__link" href="' + esc(c.url) + '" target="_blank" rel="noopener">View listing &rsaquo;</a>' : '') +
            '<button type="button" class="lotcar__inquire">Inquire &rsaquo;</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }
    // shared render — used by both the manual filters and the finder matches
    function paint(list) {
      currentList = list;
      countEl.textContent = list.length + (list.length === 1 ? " vehicle" : " vehicles");
      grid.innerHTML = list.map(cardHTML).join("");
      emptyEl.hidden = list.length > 0;
    }
    function apply() {
      var q = (searchEl.value || "").toLowerCase().trim(), mk = makeEl.value, sort = sortEl.value;
      var list = cars.filter(function (c) {
        if (nonLexus && c.make === "Lexus") return false;
        if (mk !== "All makes" && c.make !== mk) return false;
        if (cond === "new" && !isNew(c)) return false;
        if (cond === "cpo" && !c.certified) return false;
        if (cond === "used" && isNew(c)) return false;   // used = everything not new (CPO included)
        if (cond === "rare" && !isRare(c)) return false; // the special stuff, any make or age
        if (q) { var hay = (c.year + " " + c.make + " " + c.model + " " + c.trim + " " + c.ext).toLowerCase(); if (hay.indexOf(q) < 0) return false; }
        return true;
      });
      list.sort(function (a, b) {
        if (sort === "price-asc") return a.price - b.price;
        if (sort === "price-desc") return b.price - a.price;
        if (sort === "km-asc") return (a.km || 1e9) - (b.km || 1e9);
        return (b.year - a.year) || (b.price - a.price); // year-desc default
      });
      paint(list);
    }
    // clicking a card (but not the external "View listing" link) opens the inquiry popup
    grid.addEventListener("click", function (e) {
      if (e.target.closest(".lotcar__link")) return;
      var card = e.target.closest(".lotcar");
      if (card) openLotModal(currentList[+card.getAttribute("data-idx")]);
    });
    grid.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest(".lotcar");
      if (card) { e.preventDefault(); openLotModal(currentList[+card.getAttribute("data-idx")]); }
    });
    // filters + per-user activity tracking
    var searchTimer;
    searchEl.addEventListener("input", function () {
      exitMatch(); apply();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { var q = searchEl.value.trim(); if (q.length >= 2) logActivity("search", q, currentList.length + " results"); }, 900);
    });
    makeEl.addEventListener("change", function () {
      // picking a specific make cancels the Non-Lexus toggle to avoid a contradiction
      if (makeEl.value !== "All makes" && nonLexus) { nonLexus = false; nonLexEl.classList.remove("is-active"); nonLexEl.setAttribute("aria-pressed", "false"); }
      exitMatch(); apply(); logActivity("filter", "make: " + makeEl.value, currentList.length + " results");
    });
    if (nonLexEl) nonLexEl.addEventListener("click", function () {
      nonLexus = !nonLexus;
      nonLexEl.classList.toggle("is-active", nonLexus);
      nonLexEl.setAttribute("aria-pressed", nonLexus ? "true" : "false");
      if (nonLexus) makeEl.value = "All makes";   // clear any specific-make filter
      exitMatch(); apply(); logActivity("filter", "non-lexus: " + (nonLexus ? "on" : "off"), currentList.length + " results");
    });
    condEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".lotcond__btn"); if (!btn) return;
      cond = btn.getAttribute("data-cond");
      condEl.querySelectorAll(".lotcond__btn").forEach(function (b) {
        var on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      exitMatch(); apply(); logActivity("filter", "condition: " + cond, currentList.length + " results");
    });
    sortEl.addEventListener("change", function () { exitMatch(); apply(); logActivity("sort", sortEl.value); });
    renderQuiz();   // the guided finder up top …
    apply();        // … with the full lot already shown right below it
  }

  /* ---------- The Lot: inquire-about-this-car popup -------------------- */
  var lotModalCar = null;
  function openLotModal(car) {
    if (!car) return;
    lotModalCar = car;
    var m = $("#lotModal"); if (!m) return;
    var name = car.year + " " + car.make + " " + (car.trim || car.model);
    var img = $("#lotModalImg");
    if (car.photo) { img.src = car.photo; img.alt = name; img.style.display = ""; } else { img.removeAttribute("src"); img.style.display = "none"; }
    $("#lotModalPrice").textContent = money(car.price);
    $("#lotModalName").textContent = name;
    $("#lotModalMeta").textContent = [car.km ? car.km.toLocaleString("en-US") + " km" : null, car.ext, car.drive].filter(Boolean).join(" · ");
    var id = identity();
    $("#lotModalWho").textContent = (id.email || id.phone) ? ("I'll reach out to " + (id.email || id.phone) + ".") : "";
    var note = $("#lotModalNote"); if (note) note.value = "";
    var msg = $("#lotModalMsg"); if (msg) { msg.hidden = true; msg.textContent = ""; }
    var send = $("#lotModalSend"); if (send) { send.disabled = false; send.textContent = "Inquire about this car"; }
    m.hidden = false; document.body.classList.add("no-scroll");
    logActivity("view", name, car.price);
  }
  function closeLotModal() { var m = $("#lotModal"); if (m) m.hidden = true; document.body.classList.remove("no-scroll"); }
  function sendLotInquiry() {
    var car = lotModalCar; if (!car) return;
    var id = identity();
    var name = car.year + " " + car.make + " " + (car.trim || car.model);
    // no identity on file (shouldn't happen behind the gate) → fall back to the form
    if (!id.email && !id.phone) {
      var makeSel = document.getElementById("leadMake");
      if (makeSel) { var inList = Array.prototype.some.call(makeSel.options, function (o) { return o.value === car.make; }); makeSel.value = inList ? car.make : "Other"; makeSel.dispatchEvent(new Event("change", { bubbles: true })); }
      var model = document.getElementById("leadModel"); if (model) model.value = name;
      closeLotModal(); warpTo("contact"); return;
    }
    var note = ($("#lotModalNote") || {}).value || "";
    var data = {
      name: id.name || "", email: id.email || "", phone: id.phone || "",
      make: car.make, dreamcar: name, budget: money(car.price),
      notes: (note ? note + " — " : "") + "Inquiry from The Lot" + (car.url ? " (" + car.url + ")" : ""),
      source: "The Lot inquiry", consent: "Yes", captured_at: new Date().toISOString()
    };
    var send = $("#lotModalSend"), msg = $("#lotModalMsg");
    if (send) { send.disabled = true; send.textContent = "Sending…"; }
    if (S.formEndpoint) {
      try { fetch(S.formEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) }).catch(function () {}); } catch (e) {}
    }
    logActivity("inquiry", name, car.price);
    if (msg) { msg.hidden = false; msg.className = "lotmodal__msg ok"; msg.textContent = "Sent. I'll be in touch about this " + car.make + " " + car.model + "."; }
    if (send) { send.textContent = "Inquiry sent ✓"; }
    setTimeout(closeLotModal, 2400);
  }
  function initLotModal() {
    var m = $("#lotModal"); if (!m) return;
    m.addEventListener("click", function (e) { if (e.target.hasAttribute("data-lotclose")) closeLotModal(); });
    var send = $("#lotModalSend"); if (send) send.addEventListener("click", sendLotInquiry);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !m.hidden) closeLotModal(); });
  }

  /* ===================== vehicle lightbox ============================== */
  var sheetEl, lastFocus, spinMod = null;
  function startSheetSpin(c) {
    // live turntable over the still — only when the card ships a model and
    // the device is happy to animate; the still stays put on any failure
    var media = $("#sheetMedia");
    media.setAttribute("data-spin-for", c.spinModel || "");
    if (!c.spinModel || reduce) return;
    (spinMod ? Promise.resolve(spinMod) : import("./sheetspin.js?v=15").then(function (m) { spinMod = m; return m; }))
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
    // Smooth scroll is a wheel enhancement for desktop. On touch devices it
    // can hijack and freeze native scrolling on iOS Safari, so leave phones
    // and tablets on native scroll (all lenis calls are already null-guarded).
    if (reduce || coarse || typeof Lenis === "undefined") return;
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

    // "Open to a factory order?" only makes sense for a new car — reveal it
    // when New is selected, hide (and clear) it otherwise.
    var newused = form.elements["newused"], order = $("#leadOrder");
    function syncOrder() {
      if (!order) return;
      order.hidden = !newused || newused.value !== "New";
      if (order.hidden) { var s = order.querySelector("select"); if (s) s.value = ""; }
    }
    if (newused) newused.addEventListener("change", syncOrder);
    syncOrder();

    // Make dropdown + model typeahead: choosing a make filters the model
    // suggestions, so what lands in the sheet stays consistent.
    var makeSel = $("#leadMake"), modelInput = $("#leadModel"), modelList = $("#leadModels");
    if (makeSel && S.carMakes) {
      S.carMakes.forEach(function (m) {
        var o = document.createElement("option"); o.value = m; o.textContent = m; makeSel.appendChild(o);
      });
    }
    function syncModels() {
      if (!modelList) return;
      modelList.innerHTML = "";
      var list = (S.carModels && makeSel && S.carModels[makeSel.value]) || [];
      list.forEach(function (m) { var o = document.createElement("option"); o.value = m; modelList.appendChild(o); });
      if (modelInput) modelInput.placeholder = (makeSel && makeSel.value && makeSel.value !== "Other")
        ? "Start typing a " + makeSel.value + " model…" : "Type the car you want…";
    }
    if (makeSel) makeSel.addEventListener("change", function () { if (modelInput) modelInput.value = ""; syncModels(); });
    syncModels();

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusEl.className = "lead__status";
      statusEl.textContent = "";

      // validation: required text fields, valid email, contact consent
      var ok = true, firstBad = null;
      ["name", "phone", "email", "make", "dreamcar"].forEach(function (n) {
        var f = form.elements[n];
        var bad = !f.value.trim() || (n === "email" && !emailRe.test(f.value.trim()));
        f.classList.toggle("invalid", bad);
        if (bad) { ok = false; if (!firstBad) firstBad = f; }
      });
      var consent = form.elements["consent"], cw = consent.closest(".check");
      if (!consent.checked) { if (cw) cw.classList.add("invalid"); ok = false; if (!firstBad) firstBad = consent; }
      else if (cw) cw.classList.remove("invalid");
      if (!ok) {
        statusEl.className = "lead__status err";
        statusEl.textContent = "Please complete the required fields and agree to be contacted.";
        if (firstBad && firstBad.focus) firstBad.focus();
        return;
      }

      // honeypot: hidden field only bots fill
      var hp = form.elements["website"], isBot = hp && hp.value;

      // collect — checkboxes as Yes/No, skip the honeypot
      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.name === "website") return;
        data[el.name] = el.type === "checkbox" ? (el.checked ? "Yes" : "No") : el.value.trim();
      });
      data.source = "Request a Car";
      try { data.captured_at = new Date().toISOString(); } catch (e) {}

      submit.disabled = true;
      var prev = submit.textContent;
      submit.textContent = "Sending…";
      function done(success, msg) {
        submit.disabled = false; submit.textContent = prev;
        statusEl.className = "lead__status " + (success ? "ok" : "err");
        statusEl.textContent = msg;
        if (success) { form.reset(); syncOrder(); }
      }

      // Live: POST to the Google Apps Script (or Formspree) endpoint. no-cors +
      // text/plain avoids a CORS preflight Apps Script can't answer; the row
      // still lands, we just can't read the reply, so we proceed optimistically.
      if (S.formEndpoint && !isBot) {
        try {
          fetch(S.formEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) }).catch(function () {});
        } catch (e) {}
        markMember(data.email, data.phone, data.name);
        done(true, "Thank you. Your request is in. I'll be in touch personally.");
        return;
      }
      if (isBot) { done(true, "Thank you. Your request is in."); return; }

      // DEMO mode (no endpoint set): log + offer a mailto fallback
      console.log("[Phil Dave lead — DEMO mode, set SITE.formEndpoint to go live]", data);
      var to = (S.contact && S.contact.email) || "";
      if (to) {
        var subject = encodeURIComponent("Car request — " + (data.dreamcar || ""));
        var body = encodeURIComponent(
          "Name: " + data.name + "\nPhone: " + data.phone + "\nEmail: " + data.email +
          "\nDream car: " + data.dreamcar + "\nText ok: " + data.text_ok + "   Email ok: " + data.email_ok +
          "\nNew/Used: " + (data.newused || "-") + "\nType: " + (data.gentype || "-") + "\nFuel: " + (data.fuel || "-") +
          "\nMake: " + (data.make || "-") + "\nTrim: " + (data.trim || "-") +
          "\nExterior: " + (data.exterior || "-") + "\nInterior: " + (data.interior || "-") +
          "\nBudget: " + (data.budget || "-") + "\nTimeline: " + (data.timeline || "-") +
          "\nFactory order: " + (data.factory_order || "-") + "\nBusiness: " + (data.business || "-") +
          "\nHeard via: " + (data.met_how || "-"));
        window.location.href = "mailto:" + to + "?subject=" + subject + "&body=" + body;
      }
      markMember(data.email, data.phone, data.name);
      done(true, "Opening your email to send the request. (Connect a form endpoint to receive these automatically.)");
    });
  }

  /* ---------- "Find your Lexus" — short new-car enquiry ---------------- */
  // Contact details + which Lexus they want. Feeds the same sheet as the
  // main form, tagged source "Find your Lexus", make locked to Lexus.
  function initLexusForm() {
    var form = $("#lexusForm");
    if (!form) return;
    var statusEl = $("#lexusStatus"), submit = $("#lexusSubmit"), sel = $("#lexusModel");
    if (sel && S.carModels && S.carModels.Lexus) {
      S.carModels.Lexus.forEach(function (m) { var o = document.createElement("option"); o.value = m; o.textContent = m; sel.appendChild(o); });
      var o2 = document.createElement("option"); o2.value = "Not sure, help me choose"; o2.textContent = "Not sure, help me choose"; sel.appendChild(o2);
    }
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusEl.className = "lead__status"; statusEl.textContent = "";
      var ok = true, firstBad = null;
      ["name", "phone", "email", "dreamcar"].forEach(function (n) {
        var f = form.elements[n];
        var bad = !f.value.trim() || (n === "email" && !emailRe.test(f.value.trim()));
        f.classList.toggle("invalid", bad);
        if (bad) { ok = false; if (!firstBad) firstBad = f; }
      });
      var consent = form.elements["consent"], cw = consent.closest(".check");
      if (!consent.checked) { if (cw) cw.classList.add("invalid"); ok = false; if (!firstBad) firstBad = consent; }
      else if (cw) cw.classList.remove("invalid");
      if (!ok) {
        statusEl.className = "lead__status err";
        statusEl.textContent = "Please add your details and pick a model.";
        if (firstBad && firstBad.focus) firstBad.focus();
        return;
      }
      var hp = form.elements["website"], isBot = hp && hp.value;
      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.name === "website") return;
        data[el.name] = el.type === "checkbox" ? (el.checked ? "Yes" : "No") : el.value.trim();
      });
      data.source = "Find your Lexus";
      try { data.captured_at = new Date().toISOString(); } catch (e) {}
      submit.disabled = true; var prev = submit.textContent; submit.textContent = "Sending…";
      function done(success, msg) {
        submit.disabled = false; submit.textContent = prev;
        statusEl.className = "lead__status " + (success ? "ok" : "err");
        statusEl.textContent = msg; if (success) form.reset();
      }
      if (S.formEndpoint && !isBot) {
        try { fetch(S.formEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) }).catch(function () {}); } catch (e) {}
        markMember(data.email, data.phone, data.name);
        done(true, "Thank you. I'll send your Lexus pricing shortly.");
        return;
      }
      if (isBot) { done(true, "Thank you."); return; }
      var to = (S.contact && S.contact.email) || "";
      if (to) {
        var subject = encodeURIComponent("New Lexus enquiry — " + (data.dreamcar || ""));
        var body = encodeURIComponent("Name: " + data.name + "\nPhone: " + data.phone + "\nEmail: " + data.email + "\nModel: " + data.dreamcar);
        window.location.href = "mailto:" + to + "?subject=" + subject + "&body=" + body;
      }
      markMember(data.email, data.phone, data.name);
      done(true, "Opening your email to send the enquiry.");
    });
  }

  /* ===================== intro / boot ================================== */
  /* the opening: the car waits in a dark garage, then the studio lights
     stutter awake (HID-style) and bloom over the podium */
  function runIntro(then) {
    var intro = $("#intro"), bar = $(".intro__bar span");
    var finished = false;
    function finish() {
      if (finished) return;            // idempotent: timeline + failsafe race
      finished = true;
      document.body.classList.remove("is-loading");   // release the scroll lock
      if (intro) intro.classList.add("is-done");
      then && then();
    }
    // Hard failsafe: the scroll lock (body.is-loading → overflow:hidden) must
    // never outlive the intro. On mobile the GSAP timeline's completion
    // callback can fail to fire (throttled/backgrounded ticker), which would
    // leave the page permanently unscrollable — so release it on a plain
    // timer no matter what the animation does.
    setTimeout(finish, 2600);
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
    initVault();
    initLotModal();
    initForm();
    initLexusForm();
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
