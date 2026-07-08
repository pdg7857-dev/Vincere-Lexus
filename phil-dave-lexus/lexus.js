/* ============================================================================
   Phil Dave — Lexus edition. Lean single-page logic: hero turntable, a
   Lexus-only inventory grid with an inquiry popup, and the request form.
   Shares the Google Sheet endpoint and assets with the main site.
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "../phil-dave/js/vendor/three/GLTFLoader.js";
import { RoomEnvironment } from "../phil-dave/js/vendor/three/RoomEnvironment.js";

var ENDPOINT = "https://script.google.com/macros/s/AKfycbyNDlgwsTBHuUcnRWreNkLqr2S_y5-6CZ7Z_kz3Zwq34MmEvB3EsjHEuZ9WPiNlVFjPFg/exec";
var LEXUS_MODELS = ["ES 300h", "IS 350", "LS 500", "LC 500", "UX 250h", "NX 350", "NX 350h", "NX 450h+", "RX 350", "RX 350h", "RX 500h", "RZ 450e", "GX 550", "LX 600", "TX 350", "TX 500h", "Not sure — help me choose"];

var $ = function (s, c) { return (c || document).querySelector(s); };
var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); };
var money = function (n) { return "$" + Number(n).toLocaleString("en-US"); };
var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var digits = function (v) { return String(v == null ? "" : v).replace(/\D/g, ""); };
var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- hero turntable (single Lexus) ---------- */
function heroSpin() {
  var host = $("#heroSpin");
  if (!host || reduce) return;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
  var scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  var key = new THREE.DirectionalLight(0xf4f6ff, 2.4); key.position.set(4, 6, 3); scene.add(key);
  var warm = new THREE.DirectionalLight(0xd9c9a8, 0.7); warm.position.set(-5, 3, -4); scene.add(warm);
  scene.add(new THREE.AmbientLight(0x9aa0ad, 0.42));
  var spin = new THREE.Group(); scene.add(spin);
  var cam = new THREE.PerspectiveCamera(27, 1.6, 0.1, 60); cam.position.set(5.4, 1.9, 6.6); cam.lookAt(0, 0.62, 0);
  host.appendChild(renderer.domElement);
  function resize() { var w = host.clientWidth || 640, h = host.clientHeight || 420; renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  new GLTFLoader().load("../phil-dave/models/lexus-rx.glb", function (g) {
    var m = g.scene;
    m.traverse(function (o) { if (o.isMesh) { var names = [o.name || ""]; (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mm) { if (mm && mm.name) names.push(mm.name); }); if (names.some(function (n) { return n.indexOf("Plate") !== -1 || n.indexOf("License") !== -1; })) o.visible = false; } });
    var box = new THREE.Box3().setFromObject(m); var size = box.getSize(new THREE.Vector3());
    var s = 4.89 / Math.max(size.x, size.z, 0.001); m.scale.setScalar(s);
    box.setFromObject(m); var c = box.getCenter(new THREE.Vector3()); m.position.x -= c.x; m.position.z -= c.z; m.position.y -= box.min.y;
    spin.add(m); spin.rotation.y = -0.5; resize();
    var last = performance.now();
    (function tick(now) { requestAnimationFrame(tick); var dt = Math.min(0.05, (now - last) / 1000); last = now; spin.rotation.y += 0.32 * dt; renderer.render(scene, cam); })(last);
    requestAnimationFrame(function () { renderer.domElement.classList.add("is-live"); });
  }, undefined, function () { if (host) host.style.display = "none"; });
  window.addEventListener("resize", resize);
}

/* ---------- request form ---------- */
function initForm() {
  var form = $("#leadForm"); if (!form) return;
  var sel = $("#leadModel");
  if (sel) LEXUS_MODELS.forEach(function (m) { var o = document.createElement("option"); o.value = m; o.textContent = m; sel.appendChild(o); });
  var statusEl = $("#leadStatus"), submit = $("#leadSubmit");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.className = "lead__status"; statusEl.textContent = "";
    var ok = true, firstBad = null;
    ["name", "phone", "email", "dreamcar"].forEach(function (n) {
      var f = form.elements[n]; var bad = !f.value.trim() || (n === "email" && !emailRe.test(f.value.trim())) || (n === "phone" && digits(f.value).length < 10);
      f.classList.toggle("invalid", bad); if (bad) { ok = false; if (!firstBad) firstBad = f; }
    });
    var consent = form.elements.consent, cw = consent.closest(".check");
    if (!consent.checked) { if (cw) cw.classList.add("invalid"); ok = false; if (!firstBad) firstBad = consent; } else if (cw) cw.classList.remove("invalid");
    if (!ok) { statusEl.className = "lead__status err"; statusEl.textContent = "Please complete the required fields and agree to be contacted."; if (firstBad && firstBad.focus) firstBad.focus(); return; }
    var hp = form.elements.website, isBot = hp && hp.value;
    var data = {}; Array.prototype.forEach.call(form.elements, function (el) { if (!el.name || el.name === "website") return; data[el.name] = el.type === "checkbox" ? (el.checked ? "Yes" : "No") : el.value.trim(); });
    data.make = "Lexus"; data.source = "Lexus site — request"; try { data.captured_at = new Date().toISOString(); } catch (e) {}
    submit.disabled = true; var prev = submit.textContent; submit.textContent = "Sending…";
    function done(m) { submit.disabled = false; submit.textContent = prev; statusEl.className = "lead__status ok"; statusEl.textContent = m; form.reset(); }
    if (!isBot) post(data);
    done("Thank you — your Lexus request is in. I'll be in touch personally.");
  });
}

/* ---------- inventory (Lexus only) + inquiry popup ---------- */
var lotModalCar = null;
function initInventory() {
  var grid = $("#lotGrid"), countEl = $("#lotCount"), emptyEl = $("#lotEmpty");
  var searchEl = $("#lotSearch"), sortEl = $("#lotSort");
  if (!grid) return;
  fetch("../phil-dave/js/lot.json?v=1").then(function (r) { return r.json(); }).then(function (all) {
    var cars = (all || []).filter(function (c) { return c.make === "Lexus"; });
    var current = [];
    function cardHTML(c, i) {
      var name = c.year + " Lexus " + (c.trim || c.model);
      var meta = [c.km ? c.km.toLocaleString("en-US") + " km" : null, c.ext, c.drive].filter(Boolean).join(" · ");
      return '<article class="lotcar" data-idx="' + i + '" tabindex="0" role="button" aria-label="Inquire about ' + esc(name) + '">' +
        '<div class="lotcar__media">' + (c.photo ? '<img loading="lazy" decoding="async" src="' + esc(c.photo) + '" alt="' + esc(name) + '" />' : "") + (c.certified ? '<span class="lotcar__badge">Certified</span>' : "") + '</div>' +
        '<div class="lotcar__body"><span class="lotcar__price">' + money(c.price) + '</span><h4 class="lotcar__name">' + esc(name) + '</h4><p class="lotcar__meta">' + esc(meta) + '</p><span class="lotcar__cta">Inquire &rsaquo;</span></div>' +
      '</article>';
    }
    function apply() {
      var q = (searchEl.value || "").toLowerCase().trim(), sort = sortEl.value;
      var list = cars.filter(function (c) { if (!q) return true; return (c.year + " " + c.model + " " + c.trim + " " + c.ext).toLowerCase().indexOf(q) > -1; });
      list.sort(function (a, b) { if (sort === "price-asc") return a.price - b.price; if (sort === "price-desc") return b.price - a.price; if (sort === "km-asc") return (a.km || 1e9) - (b.km || 1e9); return (b.year - a.year) || (b.price - a.price); });
      current = list; countEl.textContent = list.length + (list.length === 1 ? " Lexus" : " Lexus"); grid.innerHTML = list.map(cardHTML).join(""); emptyEl.hidden = list.length > 0;
    }
    grid.addEventListener("click", function (e) { var card = e.target.closest(".lotcar"); if (card) openModal(current[+card.getAttribute("data-idx")]); });
    grid.addEventListener("keydown", function (e) { if (e.key !== "Enter" && e.key !== " ") return; var card = e.target.closest(".lotcar"); if (card) { e.preventDefault(); openModal(current[+card.getAttribute("data-idx")]); } });
    searchEl.addEventListener("input", apply); sortEl.addEventListener("change", apply);
    apply();
  }).catch(function () { if (countEl) countEl.textContent = "Inventory loading…"; });
}

function openModal(car) {
  if (!car) return; lotModalCar = car;
  var m = $("#lotModal"); if (!m) return;
  var name = car.year + " Lexus " + (car.trim || car.model);
  var img = $("#lotModalImg"); if (car.photo) { img.src = car.photo; img.alt = name; img.style.display = ""; } else { img.removeAttribute("src"); img.style.display = "none"; }
  $("#lotModalPrice").textContent = money(car.price);
  $("#lotModalName").textContent = name;
  $("#lotModalMeta").textContent = [car.km ? car.km.toLocaleString("en-US") + " km" : null, car.ext, car.drive].filter(Boolean).join(" · ");
  var f = $("#lotModalForm"); if (f) f.reset();
  var msg = $("#lotModalMsg"); if (msg) { msg.hidden = true; msg.textContent = ""; }
  var send = $("#lotModalSend"); if (send) { send.disabled = false; send.textContent = "Send inquiry"; }
  m.hidden = false; document.body.classList.add("no-scroll");
}
function closeModal() { var m = $("#lotModal"); if (m) m.hidden = true; document.body.classList.remove("no-scroll"); }
function initModal() {
  var m = $("#lotModal"); if (!m) return;
  m.addEventListener("click", function (e) { if (e.target.hasAttribute("data-lotclose")) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !m.hidden) closeModal(); });
  var form = $("#lotModalForm"), msg = $("#lotModalMsg"), send = $("#lotModalSend");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true, firstBad = null;
    ["name", "phone", "email"].forEach(function (n) { var f = form.elements[n]; var bad = !f.value.trim() || (n === "email" && !emailRe.test(f.value.trim())) || (n === "phone" && digits(f.value).length < 10); f.classList.toggle("invalid", bad); if (bad) { ok = false; if (!firstBad) firstBad = f; } });
    var consent = form.elements.consent, cw = consent.closest(".check");
    if (!consent.checked) { if (cw) cw.classList.add("invalid"); ok = false; if (!firstBad) firstBad = consent; } else if (cw) cw.classList.remove("invalid");
    if (!ok) { msg.hidden = false; msg.className = "lotmodal__msg err"; msg.textContent = "Please add your details and agree to be contacted."; if (firstBad) firstBad.focus(); return; }
    var car = lotModalCar || {}; var name = car.year + " Lexus " + (car.trim || car.model);
    var data = { name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim(), email: form.elements.email.value.trim(), consent: "Yes", make: "Lexus", dreamcar: name, budget: money(car.price), notes: "Inquiry from Lexus inventory" + (car.url ? " (" + car.url + ")" : ""), source: "Lexus site — inventory inquiry" };
    try { data.captured_at = new Date().toISOString(); } catch (e) {}
    send.disabled = true; send.textContent = "Sending…";
    post(data);
    msg.hidden = false; msg.className = "lotmodal__msg ok"; msg.textContent = "Sent — I'll be in touch about this " + (car.trim || car.model) + ".";
    send.textContent = "Inquiry sent ✓";
    setTimeout(closeModal, 2200);
  });
}

/* ---------- shared POST (no-cors, sheet-friendly) ---------- */
function post(data) {
  try { fetch(ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) }).catch(function () {}); } catch (e) {}
}

/* ---------- boot ---------- */
function boot() { heroSpin(); initForm(); initInventory(); initModal(); var y = $("#year"); if (y) y.textContent = new Date().getFullYear(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
