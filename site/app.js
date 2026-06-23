/* ============================================================
   Phil Dave — concierge site interactions
   Vanilla JS. No dependencies, no build step.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Featured collection (real Northwest Lexus dealer-network finds) ----------
     A hand-picked, rotating selection. Refresh from data/inventory.json when stock changes. */
  var CARS = [
    { make: 'Lexus', name: 'LX 700h Executive VIP', year: 2026, price: 173605, condition: 'New', color: 'Black', odo: 0,
      url: 'https://www.northwestlexus.com/inventory/2026-lexus-lx-lx-700h-mL7RQoTOQKeguGhx70UpXwvdp' },
    { make: 'Lexus', name: 'LX 600 F SPORT', year: 2026, price: 139995, condition: 'New', color: 'Silver', odo: 0,
      url: 'https://www.northwestlexus.com/inventory/2026-lexus-lx-lx-600-fTswc3csRjOXMZo03kFY6wvdp' },
    { make: 'Land Rover', name: 'Defender X-Dynamic SE', year: 2025, price: 91498, condition: 'Certified Pre-Owned', color: 'Gray', odo: 14721,
      url: 'https://www.northwestlexus.com/inventory/2025-land-rover-defender-x-dynamic-se-IN5ChXzHQcGhuGTePR7sHAvdp' },
    { make: 'Lexus', name: 'GX 550', year: 2024, price: 99800, condition: 'Used', color: 'Black', odo: 32873,
      url: 'https://www.northwestlexus.com/inventory/2024-lexus-gx-gx-550-2r1TH5X4Rlay5zBvV5zpWwvdp' },
    { make: 'Lexus', name: 'RZ 450e Executive', year: 2026, price: 82960, condition: 'New', color: 'Black', odo: 0,
      url: 'https://www.northwestlexus.com/inventory/2026-lexus-rz-rz-450e-YbSingmTQwCEyz0XQGl06gvdp' },
    { make: 'Lexus', name: 'RX 500h F SPORT', year: 2023, price: 64498, condition: 'Used', color: 'White', odo: 35537,
      url: 'https://www.northwestlexus.com/inventory/2023-lexus-rx-rx-500h-HuMOSYP2R0WaVI0JZhsYZQvdp' }
  ];

  /* Elegant SVG silhouettes (SUV vs car) used as on-brand placeholders until real photos are dropped in. */
  function silhouette(kind) {
    var suv = '<path d="M30 150 L55 95 Q62 80 80 80 L210 80 Q232 80 245 98 L290 120 Q330 128 360 135 Q378 140 378 158 L378 150 Z"/>' +
      '<rect x="70" y="92" width="55" height="40" rx="6"/><rect x="135" y="92" width="70" height="40" rx="6"/>';
    var car = '<path d="M22 150 L60 118 Q72 100 100 98 L175 92 Q205 75 245 80 L300 98 Q345 105 378 128 Q390 134 390 152 L390 150 Z"/>' +
      '<path d="M95 100 L120 78 L190 74 L205 96 Z" opacity=".5"/><path d="M210 94 L240 80 L290 96 Z" opacity=".5"/>';
    return '<svg class="card__silhouette" viewBox="0 0 400 170" fill="none" stroke="rgba(201,169,106,.55)" stroke-width="1.4" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="rgba(255,255,255,.025)">' + (kind === 'car' ? car : suv) + '</g>' +
      '<circle cx="120" cy="150" r="20"/><circle cx="300" cy="150" r="20"/>' +
      '<circle cx="120" cy="150" r="9" fill="rgba(201,169,106,.25)"/><circle cx="300" cy="150" r="9" fill="rgba(201,169,106,.25)"/>' +
      '</svg>';
  }

  function money(n) { return '$' + n.toLocaleString('en-CA'); }

  function renderCards() {
    var wrap = document.querySelector('[data-cards]');
    if (!wrap) return;
    var sedans = ['RZ 450e Executive', 'RX 500h F SPORT'];
    wrap.innerHTML = CARS.map(function (c) {
      var kind = sedans.indexOf(c.name) > -1 ? 'car' : 'suv';
      var meta = [c.color, c.odo > 0 ? c.odo.toLocaleString('en-CA') + ' km' : 'Brand new'].join(' · ');
      return '' +
        '<a class="card" data-reveal href="' + c.url + '" target="_blank" rel="noopener">' +
          '<div class="card__visual"><span class="card__badge">' + c.condition + '</span>' + silhouette(kind) + '</div>' +
          '<div class="card__body">' +
            '<span class="card__make">' + c.make + ' · ' + c.year + '</span>' +
            '<h3 class="card__name">' + c.name + '</h3>' +
            '<div class="card__meta">' + meta + '</div>' +
            '<div class="card__foot"><span class="card__price">' + money(c.price) + '</span>' +
            '<span class="card__link">Enquire →</span></div>' +
          '</div>' +
        '</a>';
    }).join('');
    // newly injected cards need observing
    document.querySelectorAll('[data-cards] [data-reveal]').forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Scroll reveal ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  function initReveal() {
    document.querySelectorAll('[data-reveal], [data-reveal-line]').forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Word-by-word intro ---------- */
  function initWordReveal() {
    var el = document.querySelector('[data-reveal-words]');
    if (!el) return;
    var html = el.innerHTML;
    // wrap plain text words, preserve <em> tags
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (w) {
            if (w.trim() === '') { frag.appendChild(document.createTextNode(w)); }
            else { var s = document.createElement('span'); s.className = 'word'; s.textContent = w; frag.appendChild(s); }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) { wrap(child); }
      });
    }
    wrap(tmp);
    el.innerHTML = tmp.innerHTML;
    var words = el.querySelectorAll('.word');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        words.forEach(function (w, i) { setTimeout(function () { w.classList.add('lit'); }, i * 38); });
        io.disconnect();
      });
    }, { threshold: 0.4 });
    io.observe(el);
  }

  /* ---------- Hero line reveal (on load) ---------- */
  function initHeroLines() {
    document.querySelectorAll('[data-reveal-line]').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('in'); }, 180 + i * 130);
    });
  }

  /* ---------- Nav state + scroll progress ---------- */
  function initScroll() {
    var nav = document.querySelector('[data-nav]');
    var bar = document.querySelector('[data-progress]');
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (nav) nav.classList.toggle('is-stuck', y > 40);
      if (bar) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    var burger = document.querySelector('[data-burger]');
    if (!burger) return;
    burger.addEventListener('click', function () { document.body.classList.toggle('menu-open'); });
    document.querySelectorAll('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('menu-open'); });
    });
  }

  /* ---------- Custom cursor + magnetic ---------- */
  function initCursor() {
    if (window.matchMedia('(hover: none)').matches) return;
    var ring = document.querySelector('[data-cursor]');
    var dot = document.querySelector('[data-cursor-dot]');
    var rx = 0, ry = 0, dx = 0, dy = 0, tx = 0, ty = 0;
    window.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
      dx += (tx - dx) * 0.42; dy += (ty - dy) * 0.42;
      if (ring) ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      if (dot) dot.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, [data-magnetic], input, textarea').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring && ring.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { ring && ring.classList.remove('is-hover'); });
    });
    // magnetic pull
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + mx * 0.25 + 'px,' + my * 0.35 + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Marquee loop ---------- */
  function initMarquee() {
    var track = document.querySelector('[data-marquee]');
    if (!track) return;
    var x = 0, half = track.scrollWidth / 2;
    (function move() {
      x -= 0.4; if (Math.abs(x) >= half) x = 0;
      track.style.transform = 'translateX(' + x + 'px)';
      requestAnimationFrame(move);
    })();
  }

  /* ---------- Hero parallax + video ---------- */
  function initHero() {
    var hero = document.querySelector('[data-hero]');
    if (hero) {
      var glows = hero.querySelectorAll('.hero__glow');
      window.addEventListener('mousemove', function (e) {
        var mx = (e.clientX / window.innerWidth - 0.5);
        var my = (e.clientY / window.innerHeight - 0.5);
        glows.forEach(function (g, i) {
          var d = (i + 1) * 18;
          g.style.marginLeft = (mx * d) + 'px';
          g.style.marginTop = (my * d) + 'px';
        });
      });
    }
    var v = document.querySelector('.hero__video');
    if (v) {
      v.addEventListener('loadeddata', function () { if (v.videoWidth) v.classList.add('is-ready'); });
      // trigger load only once we know a source may exist
      try { v.load(); } catch (e) {}
    }
  }

  /* ---------- Year ---------- */
  function initYear() {
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderCards();
    initReveal();
    initWordReveal();
    initHeroLines();
    initScroll();
    initMenu();
    initCursor();
    initMarquee();
    initHero();
    initYear();
  });
})();
