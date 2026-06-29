/* ============================================================
   Phil Dave · site interactions
   Vanilla JS. No dependencies, no build step.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Photo frames: show a tasteful placeholder until a real
       image loads. Works for the gallery shots and the About portrait. ---------- */
  function initFrames() {
    document.querySelectorAll('[data-img]').forEach(function (img) {
      var frame = img.parentElement;  // .car__media / .gallery__lead / .about__frame
      function empty() { frame.classList.add('is-empty'); }
      function filled() { frame.classList.remove('is-empty'); }
      // no source set, or it fails to load -> placeholder
      var src = img.getAttribute('src');
      if (!src) { empty(); return; }
      if (img.complete) { (img.naturalWidth > 0 ? filled : empty)(); }
      img.addEventListener('error', empty);
      img.addEventListener('load', function () { (img.naturalWidth > 0 ? filled : empty)(); });
    });
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
    var tmp = document.createElement('div'); tmp.innerHTML = el.innerHTML;
    (function wrap(node) {
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
    })(tmp);
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

  /* ---------- Hero line reveal ---------- */
  function initHeroLines() {
    document.querySelectorAll('[data-reveal-line]').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('in'); }, 180 + i * 120);
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

  /* ---------- Marquee loops (clone each track for a seamless scroll) ---------- */
  function runMarquee(track) {
    var speed = parseFloat(track.getAttribute('data-speed')) || 0.4;
    var parent = track.parentElement;
    function start() {
      var base = track.innerHTML;
      var ref = (parent && parent.clientWidth) || window.innerWidth;
      var guard = 0;
      while (track.scrollWidth < ref * 1.3 && guard++ < 12) { track.innerHTML += base; }
      var unit = track.scrollWidth;        // width of one repeating unit
      track.innerHTML += track.innerHTML;  // duplicate so the loop never gaps
      var x = 0;
      (function move() {
        x -= speed; if (Math.abs(x) >= unit) x = 0;
        track.style.transform = 'translateX(' + x + 'px)';
        requestAnimationFrame(move);
      })();
    }
    var imgs = track.querySelectorAll('img');
    var pending = imgs.length;
    if (!pending) return start();
    imgs.forEach(function (im) {
      if (im.complete) { if (--pending === 0) start(); }
      else { im.addEventListener('load', function () { if (--pending === 0) start(); });
             im.addEventListener('error', function () { if (--pending === 0) start(); }); }
    });
  }
  function initMarquee() {
    document.querySelectorAll('[data-marquee]').forEach(runMarquee);
  }

  /* ---------- Hero parallax + video ---------- */
  function initHero() {
    var v = document.querySelector('.hero__video');
    if (v) {
      v.addEventListener('loadeddata', function () { if (v.videoWidth) v.classList.add('is-ready'); });
      try { v.load(); } catch (e) {}
    }
  }

  /* ---------- Contact form (Google Apps Script -> Google Sheet) ----------
     Paste your deployed Web-app URL (ends with /exec) as SCRIPT_URL below.
     See site/integrations/leads-apps-script.gs for the script + setup. */
  function initForm() {
    var SCRIPT_URL = 'REPLACE_WITH_APPS_SCRIPT_URL';
    var form = document.querySelector('[data-form]');
    if (!form) return;
    var status = form.querySelector('[data-form-status]');
    var btn = form.querySelector('button[type="submit"]');
    function setStatus(msg, state) {
      if (!status) return;
      status.textContent = msg || '';
      status.className = 'form__status' + (state ? ' is-' + state : '');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var hp = form.querySelector('[name="botcheck"]');
      if (hp && hp.checked) { return; } // honeypot: silently drop bots
      if (SCRIPT_URL.indexOf('REPLACE_WITH') === 0) {
        setStatus('Form not connected yet. Add your Google Apps Script URL.', 'err'); return;
      }
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      setStatus('', null);
      // no-cors: Apps Script accepts the multipart POST; response is opaque, so treat completion as success.
      fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new FormData(form) })
        .then(function () { form.reset(); setStatus("Thank you. Your brief is in and I'll be in touch shortly.", 'ok'); })
        .catch(function () { setStatus('Network error. Please email pdg7857@gmail.com.', 'err'); })
        .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
  }

  /* ---------- Year ---------- */
  function initYear() {
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFrames();
    initReveal();
    initWordReveal();
    initHeroLines();
    initScroll();
    initMenu();
    initCursor();
    initMarquee();
    initForm();
    initHero();
    initYear();
  });
})();
