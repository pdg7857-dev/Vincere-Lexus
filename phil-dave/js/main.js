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

    // hotspots (positions distributed around the car)
    var hs = $("#hotspots");
    var positions = [
      { x: 22, y: 30 }, { x: 76, y: 26 }, { x: 30, y: 70 }, { x: 70, y: 72 }, { x: 50, y: 18 }
    ];
    (S.rooms || []).forEach(function (room, i) {
      var p = positions[i % positions.length];
      var btn = document.createElement("button");
      btn.className = "hotspot magnetic";
      btn.type = "button";
      btn.style.left = p.x + "%";
      btn.style.top = p.y + "%";
      btn.setAttribute("data-target", room.id);
      btn.setAttribute("aria-label", "Enter " + room.label + " — " + (room.hint || ""));
      btn.innerHTML =
        '<span class="hotspot__dot" aria-hidden="true"></span>' +
        '<span class="hotspot__label"><b>' + esc(room.label) + "</b><span>" + esc(room.hint || "") + "</span></span>";
      hs.appendChild(btn);
    });

    // inventory (+ filters)
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

    // about
    if (S.about) {
      $("#aboutLead").textContent = S.about.lead || "";
      $("#aboutBody").innerHTML = (S.about.body || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    }
    $("#aboutStats").innerHTML = (S.stats || []).map(function (s) {
      return '<div class="stat"><div class="stat__value">' + esc(s.value) + '</div><div class="stat__label">' + esc(s.label) + "</div></div>";
    }).join("");

    // marquee (doubled for a seamless loop)
    var marques = (S.marques || []).map(function (m) { return '<span class="marque">' + esc(m) + "</span>"; }).join("");
    $("#marqueeTrack").innerHTML = marques + marques;

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

  /* ===================== inventory + filters ========================== */
  var activeStatus = "all", activeMarque = "all";

  function carMedia(c) {
    if (c.image) {
      return '<img src="' + esc(c.image) + '" alt="' + esc(c.year + " " + c.make + " " + c.model) + '" loading="lazy" />';
    }
    var silo = window.SILHOUETTES && (window.SILHOUETTES[c.body] || window.SILHOUETTES.sedan);
    return '<div class="card__art">' + (silo ? silo() : "") +
      '<span class="card__marque">' + esc(c.make) + "</span></div>";
  }

  function cardHTML(c, i) {
    var st = (c.status || "Available").toLowerCase();
    return (
      '<article class="card will-reveal" data-i="' + i + '" data-status="' + esc(st) + '" data-marque="' + esc(c.make) + '" tabindex="0" role="button" aria-label="' + esc(c.year + " " + c.make + " " + c.model) + ', view details">' +
        '<span class="status status--' + esc(st) + '">' + esc(c.status || "Available") + "</span>" +
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
    if (!inv.length) { grid.innerHTML = '<div class="empty">New arrivals incoming.</div>'; return; }
    grid.innerHTML = inv.map(cardHTML).join("");

    // filter bar — statuses present + marques present
    var statuses = ["all"].concat(uniq(inv.map(function (c) { return c.status || "Available"; })));
    var marques = ["all"].concat(uniq(inv.map(function (c) { return c.make; })));
    var fb = $("#inventoryFilters");
    fb.innerHTML =
      '<div class="filters__group" data-kind="status">' +
        statuses.map(function (s) { return chip(s, "status"); }).join("") +
      "</div>" +
      '<div class="filters__group" data-kind="marque">' +
        marques.map(function (m) { return chip(m, "marque"); }).join("") +
      "</div>";

    fb.querySelectorAll(".chip").forEach(function (ch) {
      ch.addEventListener("click", function () {
        var kind = ch.getAttribute("data-kind"), val = ch.getAttribute("data-val");
        if (kind === "status") activeStatus = val; else activeMarque = val;
        fb.querySelectorAll('.chip[data-kind="' + kind + '"]').forEach(function (c) { c.classList.toggle("is-active", c === ch); });
        applyFilter();
      });
    });

    // card → lightbox
    grid.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("click", function () { openSheet(inv[+card.getAttribute("data-i")]); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(inv[+card.getAttribute("data-i")]); }
      });
    });
  }

  function applyFilter() {
    var cards = $$("#inventoryGrid .card");
    var shown = 0;
    cards.forEach(function (card) {
      var okS = activeStatus === "all" || card.getAttribute("data-status") === activeStatus.toLowerCase();
      var okM = activeMarque === "all" || card.getAttribute("data-marque") === activeMarque;
      var on = okS && okM;
      if (on) shown++;
      if (hasGSAP && !reduce) {
        if (on) { card.style.display = ""; gsap.fromTo(card, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }); }
        else gsap.to(card, { opacity: 0, y: 8, duration: 0.25, onComplete: function () { card.style.display = "none"; } });
      } else { card.style.display = on ? "" : "none"; }
    });
    var grid = $("#inventoryGrid");
    var none = grid.querySelector(".filters-empty");
    if (!shown) {
      if (!none) { none = document.createElement("div"); none.className = "empty filters-empty"; none.textContent = "Nothing matching — but I can source it."; grid.appendChild(none); }
    } else if (none) none.remove();
    if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
  }

  function chip(val, kind) {
    var label = val === "all" ? (kind === "status" ? "All" : "All marques") : val;
    return '<button class="chip' + (val === "all" ? " is-active" : "") + '" type="button" data-kind="' + kind + '" data-val="' + esc(val) + '">' + esc(label) + "</button>";
  }
  function uniq(arr) { var seen = {}; return arr.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; }); }

  /* ===================== vehicle lightbox ============================== */
  var sheetEl, lastFocus;
  function openSheet(c) {
    if (!c) return;
    sheetEl = sheetEl || $("#sheet");
    lastFocus = document.activeElement;
    $("#sheetMedia").innerHTML = carMedia(c);
    var st = (c.status || "Available");
    var sS = $("#sheetStatus"); sS.textContent = st; sS.className = "sheet__status status status--" + st.toLowerCase();
    $("#sheetYear").textContent = c.year + " · " + c.make;
    $("#sheetName").textContent = c.model;
    $("#sheetNote").textContent = c.note || "";
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

  /* ===================== side room navigator ========================== */
  function initDots() {
    var wrap = $("#dots");
    if (!wrap) return;
    var sections = [{ id: "hero", label: "Showroom" }].concat((S.rooms || []).map(function (r) { return { id: r.id, label: r.label }; }));
    wrap.innerHTML = sections.map(function (s) {
      return '<button class="dot" type="button" data-target="' + esc(s.id) + '" aria-label="' + esc(s.label) + '"><span class="dot__label">' + esc(s.label) + "</span></button>";
    }).join("");
    wrap.querySelectorAll(".dot").forEach(function (d) {
      d.addEventListener("click", function () { warpTo(d.getAttribute("data-target")); });
    });
    if (hasGSAP && window.ScrollTrigger) {
      sections.forEach(function (s) {
        var el = document.getElementById(s.id);
        if (!el) return;
        ScrollTrigger.create({
          trigger: el, start: "top 50%", end: "bottom 50%",
          onToggle: function (self) {
            if (self.isActive) {
              wrap.querySelectorAll(".dot").forEach(function (d) { d.classList.toggle("is-active", d.getAttribute("data-target") === s.id); });
            }
          }
        });
      });
    }
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

  /* ===================== cinematic room transition ===================== */
  var warping = false;
  function warpTo(id) {
    closeMenu();
    if (reduce || !hasGSAP) { scrollToId(id); return; }
    if (warping) return;
    warping = true;
    var warp = $("#warp"), core = $(".warp__core"), main = $("#main");
    var tl = gsap.timeline({ onComplete: function () { warping = false; } });
    tl.set(warp, { opacity: 1 })
      .set(core, { scale: 1, opacity: 1 })
      // push "into" the screen
      .to(main, { scale: 1.06, filter: "blur(6px)", duration: 0.42, ease: "power2.in" }, 0)
      .to(core, { scale: 90, duration: 0.5, ease: "power2.in" }, 0.04)
      .add(function () { scrollToId(id); })
      // arrive in the room
      .to(core, { opacity: 0, duration: 0.4, ease: "power2.out" }, 0.5)
      .to(main, { scale: 1, filter: "blur(0px)", duration: 0.6, ease: "power3.out" }, 0.5)
      .set(warp, { opacity: 0 });
  }

  /* ===================== reveals & scroll motion ======================= */
  function initReveals() {
    if (!hasGSAP || !window.ScrollTrigger) {
      $$(".will-reveal").forEach(function (el) { el.classList.add("in"); });
      return;
    }
    // line masks in hero + headings
    $$(".reveal-line").forEach(function (line) {
      gsap.from(line, {
        yPercent: 110, opacity: 0, duration: 1.1, ease: "power4.out",
        scrollTrigger: { trigger: line, start: "top 92%" }
      });
    });
    // generic reveal blocks, gently staggered within their grid
    $$(".room").forEach(function (room) {
      var items = $$(".will-reveal", room);
      if (!items.length) return;
      gsap.to(items, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: room, start: "top 70%" }
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
        gsap.to("#stageCar", { rotationY: nx * 8, rotationX: -ny * 5, duration: 0.8, ease: "power3", transformPerspective: 800 });
      });
      stage.addEventListener("mouseleave", function () {
        gsap.to("#stageCar", { rotationY: 0, rotationX: 0, duration: 1.2, ease: "power3" });
      });
    }
  }

  /* ===================== optional Three.js turntable ===================
     Activates ONLY if SITE.heroModel points to a .glb that loads.
     Loads three + GLTFLoader from CDN on demand so the base site stays light.
  ===================================================================== */
  function initThree() {
    if (reduce || coarse || !S.heroModel) return;
    var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
    var GLTF_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
    var ORBIT_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
    import(THREE_URL).then(function (THREE) {
      return Promise.all([import(GLTF_URL), import(ORBIT_URL)]).then(function (mods) {
        var GLTFLoader = mods[0].GLTFLoader, OrbitControls = mods[1].OrbitControls;
        var mount = $("#three");
        var w = mount.clientWidth || 800, h = mount.clientHeight || 450;
        var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(w, h); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        mount.appendChild(renderer.domElement);
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
        camera.position.set(4.2, 1.6, 5.2);
        var key = new THREE.SpotLight(0xffffff, 60, 0, Math.PI / 6, 0.4);
        key.position.set(0, 8, 2); scene.add(key);
        scene.add(new THREE.AmbientLight(0x99a, 0.6));
        scene.add(new THREE.HemisphereLight(0xffffff, 0x111114, 0.5));
        var controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
        controls.autoRotate = true; controls.autoRotateSpeed = 0.8;
        controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2.3;
        new GLTFLoader().load(S.heroModel, function (gltf) {
          scene.add(gltf.scene);
          // swap 2D hero for 3D
          $("#stageCar").style.display = "none";
          mount.hidden = false;
          function loop() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop); }
          loop();
        }, null, function () { /* model failed → keep 2D hero */ });
        window.addEventListener("resize", function () {
          var nw = mount.clientWidth, nh = mount.clientHeight;
          camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
        });
      });
    }).catch(function () { /* no module support / offline → keep 2D hero */ });
  }

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
    // hotspots → warp
    $$(".hotspot").forEach(function (h) {
      h.addEventListener("click", function () { warpTo(h.getAttribute("data-target")); });
    });
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
  function runIntro(then) {
    var intro = $("#intro"), bar = $(".intro__bar span");
    function finish() {
      document.body.classList.remove("is-loading");
      intro.classList.add("is-done");
      then && then();
    }
    if (reduce || !hasGSAP) { finish(); return; }
    var tl = gsap.timeline();
    tl.to(bar, { width: "100%", duration: 1.3, ease: "power2.inOut", delay: 0.3 })
      .to(intro, { duration: 0.2 })
      .add(finish)
      // hero entrance: lights come up on the car
      .from(".stage", { opacity: 0, scale: 0.92, duration: 1.4, ease: "power3.out" }, "+=0.0")
      .from(".hotspot", { opacity: 0, scale: 0, stagger: 0.12, duration: 0.6, ease: "back.out(2)" }, "-=0.6")
      .from(".hero__spot", { opacity: 0, duration: 1.6, ease: "power2.out" }, 0);
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
    initThree();
    runIntro(function () { if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
