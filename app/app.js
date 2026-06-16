/* Lexus Trim Matcher — sales companion app logic */
(function () {
"use strict";

const DATA = window.LEXUS_DATA;
if (!DATA) { document.body.innerHTML = "<p style='padding:40px'>data.js failed to load. Run scripts/build_dataset.py.</p>"; return; }

const FC = DATA.featureCatalog;
const WANTS = DATA.wants;
const WANT_BY_ID = Object.fromEntries(WANTS.map(w => [w.id, w]));

const state = {
  mode: "match",
  province: DATA.meta.defaultProvince,
  wants: {},                // id -> 'must' | 'nice'
  filter: { category: "", model: "", budget: 0 },
  browseSlug: DATA.models[0].slug,
  browseVariant: 0,
  browseSpecFilter: "",
  print: { client: "", rep: "" },
  pay: { apr: DATA.meta.finance.defaultApr, term: DATA.meta.finance.defaultTermMonths, down: DATA.meta.finance.defaultDown },
  finder: { sel: [], mode: "all", q: "" },
  cart: [],
};
try { const c = JSON.parse(localStorage.getItem("lexusCart") || "[]"); if (Array.isArray(c)) state.cart = c.filter(resolveKey); } catch (e) {}
let lastMatch = null;   // cache of last computed recommendations for the print sheet

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const money = n => (n == null ? "—" : "$" + Math.round(n).toLocaleString("en-CA"));
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#34;" }[c]));
// scene7 image sized for crispness
function imgUrl(url, w) {
  if (!url) return "";
  return url + (url.includes("?") ? "&" : "?") + "wid=" + (w || 520);
}
function photoHTML(variant, w, cls) {
  return variant.image
    ? `<div class="${cls}"><img loading="lazy" src="${imgUrl(variant.image, w)}" alt="${esc(variant.name)}"></div>`
    : `<div class="${cls}"></div>`;
}

function trimPrice(trim) {
  const p = trim.price[state.province];
  if (p) return p;
  const any = Object.values(trim.price)[0];
  return any || {};
}
function startPrice(trim) { const p = trimPrice(trim); return p.start != null ? p.start : Infinity; }

// monthly finance payment, amortized from the trim start price at the consultant's APR/term
function financeMonthly(trim) {
  const P = startPrice(trim) - (state.pay.down || 0);
  if (!isFinite(P) || P <= 0) return null;
  const n = state.pay.term, r = (state.pay.apr / 100) / 12;
  return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
}
// lease (advertised) + finance (estimated) lines for a trim
function payHTML(trim) {
  const p = trimPrice(trim);
  const lease = p.payment
    ? `<div class="pay lease"><b>Lease ${money(p.payment)}/mo</b> · ${p.rate}% · ${p.term} mo · ${(p.km / 1000)}k km/yr</div>`
    : `<div class="pay lease muted">Lease — n/a</div>`;
  const fm = financeMonthly(trim);
  const fin = fm
    ? `<div class="pay fin">Finance ~${money(fm)}/mo · ${state.pay.apr}% · ${state.pay.term} mo</div>`
    : "";
  return lease + fin;
}
// warranty rows applicable to a variant's powertrain class
function warrantyFor(variant) {
  const W = DATA.meta.warranty, pc = variant.ptClass;
  let rows = [...W.core];
  if (pc !== "ev") rows = rows.concat(W.combustion);
  if (W[pc]) rows = rows.concat(W[pc]);
  return rows;
}

/* ---------- cart + dealer stock cross-reference ---------- */
const INV = window.LEXUS_INVENTORY || { meta: {}, units: [] };
const invNorm = s => (s == null ? "" : String(s)).toLowerCase()
  .replace(/[^a-z0-9+ ]/g, " ").replace(/\b(awd|fwd|rwd|package|pkg)\b/g, " ").replace(/\s+/g, " ").trim();
const modelLine = s => invNorm(s).split(" ")[0];

function cartKey(model, variant, trim) { return `${model.slug}|${variant.modelId}|${trim.id}`; }
function inCart(key) { return state.cart.includes(key); }
function toggleCart(key) {
  state.cart = inCart(key) ? state.cart.filter(k => k !== key) : state.cart.concat(key);
  try { localStorage.setItem("lexusCart", JSON.stringify(state.cart)); } catch (e) {}
  updateCartCount();
}
function resolveKey(key) {
  const [slug, mid, tid] = key.split("|");
  const model = DATA.models.find(m => m.slug === slug); if (!model) return null;
  const variant = model.variants.find(v => v.modelId === mid); if (!variant) return null;
  const trim = variant.trims.find(t => t.id === tid); if (!trim) return null;
  return { model, variant, trim };
}
function updateCartCount() {
  const el = $("#cart-count"); if (!el) return;
  el.textContent = state.cart.length;
  el.classList.toggle("hidden", state.cart.length === 0);
}
// match dealer units to a specific (variant, trim): exact trim, else other trims of same model
function matchUnits(model, variant, trim) {
  const vN = invNorm(variant.name), tN = invNorm(trim.name), line = invNorm(model.name);
  const exact = [], alt = [];
  for (const u of INV.units) {
    const um = invNorm(u.model), ut = invNorm(u.trim);
    const modelEq = um === vN;
    const trimEq = ut === tN || (ut && tN && (ut.includes(tN) || tN.includes(ut)));
    if (modelEq && trimEq) exact.push(u);
    else if (modelLine(u.model) === line) alt.push(u);
  }
  exact.sort((a, b) => (a.price || 0) - (b.price || 0));
  alt.sort((a, b) => (a.price || 0) - (b.price || 0));
  return { exact, alt };
}

// flat list of {model, variant, trim} respecting filters (model/category/budget)
function filteredTrims() {
  const out = [];
  for (const m of DATA.models) {
    if (state.filter.category && m.category !== state.filter.category) continue;
    if (state.filter.model && m.slug !== state.filter.model) continue;
    for (const v of m.variants) {
      for (const t of v.trims) {
        if (state.filter.budget && startPrice(t) > state.filter.budget) continue;
        out.push({ model: m, variant: v, trim: t });
      }
    }
  }
  return out;
}

// per-model want rarity -> exclusivity flag
const rarity = {}; // slug -> wantId -> fraction of trims that satisfy
for (const m of DATA.models) {
  const counts = {}, total = m.variants.reduce((a, v) => a + v.trims.length, 0) || 1;
  for (const v of m.variants) for (const t of v.trims) for (const w of t.satisfies) counts[w] = (counts[w] || 0) + 1;
  rarity[m.slug] = {};
  for (const w in counts) rarity[m.slug][w] = counts[w] / total;
}
const isExclusive = (slug, wid) => (rarity[slug][wid] || 0) <= 0.5;

const NOTABLE = /mark levinson|panoramic moonroof|moonroof|head-up|massage|ventilated|heated.*steering|navigation|14.|adaptive|semi-aniline|leather seats|alloy wheels|air suspension|blind spot|digital key|wireless|surround|captain|memory/i;

/* ---------- init controls ---------- */
function initControls() {
  const prov = $("#province");
  DATA.provinces.forEach(p => prov.appendChild(new Option(p, p)));
  prov.value = state.province;
  prov.addEventListener("change", () => { state.province = prov.value; renderAll(); });

  const cats = [...new Set(DATA.models.map(m => m.category))];
  const fc = $("#filter-category");
  cats.forEach(c => fc.appendChild(new Option(c, c)));
  fc.addEventListener("change", () => {
    state.filter.category = fc.value;
    rebuildModelFilter();
    renderMatch();
  });

  rebuildModelFilter();
  $("#filter-model").addEventListener("change", e => { state.filter.model = e.target.value; renderMatch(); });

  const fb = $("#filter-budget");
  [0, 50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000].forEach(b =>
    fb.appendChild(new Option(b ? "Up to " + money(b) : "No limit", b)));
  fb.addEventListener("change", e => { state.filter.budget = +e.target.value; renderMatch(); });

  document.querySelectorAll(".tab").forEach(t =>
    t.addEventListener("click", () => setMode(t.dataset.mode)));

  $("#clear-wants").addEventListener("click", () => { state.wants = {}; renderWants(); renderMatch(); });

  $("#foot-meta").textContent =
    `${DATA.meta.modelCount} models · data ${DATA.meta.generated} · ${DATA.meta.source}. ${DATA.meta.priceNote}`;
}

function rebuildModelFilter() {
  const fm = $("#filter-model");
  fm.innerHTML = "";
  fm.appendChild(new Option("All", ""));
  DATA.models.filter(m => !state.filter.category || m.category === state.filter.category)
    .forEach(m => fm.appendChild(new Option(`${m.name} · ${m.subtitle}`, m.slug)));
  if (state.filter.model && !DATA.models.some(m => m.slug === state.filter.model && (!state.filter.category || m.category === state.filter.category))) {
    state.filter.model = "";
  }
  fm.value = state.filter.model;
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
  ["match", "browse", "finder", "cart"].forEach(m => $("#mode-" + m).classList.toggle("hidden", m !== mode));
  renderAll();
}

/* ---------- questionnaire ---------- */
function renderWants() {
  const box = $("#wants");
  box.innerHTML = "";
  const cats = [];
  for (const w of WANTS) if (!cats.includes(w.cat)) cats.push(w.cat);
  for (const cat of cats) {
    box.appendChild(el("div", "want-cat", cat));
    for (const w of WANTS.filter(x => x.cat === cat)) {
      const st = state.wants[w.id];
      const chip = el("button", "chip" + (st ? " " + st : ""));
      const label = el("span", null, w.label + (w.note ? ` <span style="color:var(--mut2)" title="${w.note.replace(/"/g, "&#34;")}">ⓘ</span>` : ""));
      const tag = el("span", "state", st === "must" ? "MUST" : st === "nice" ? "NICE" : "ADD");
      chip.appendChild(label); chip.appendChild(tag);
      chip.addEventListener("click", () => {
        state.wants[w.id] = st === undefined ? "must" : st === "must" ? "nice" : undefined;
        if (state.wants[w.id] === undefined) delete state.wants[w.id];
        renderWants(); renderMatch();
      });
      box.appendChild(chip);
    }
  }
  const musts = Object.values(state.wants).filter(v => v === "must").length;
  const nices = Object.values(state.wants).filter(v => v === "nice").length;
  $("#want-summary").textContent = `${musts} must-have${musts !== 1 ? "s" : ""}, ${nices} nice-to-have${nices !== 1 ? "s" : ""}`;
}

/* ---------- upsell engine ---------- */
function nextTrimUp(model, variant, trim) {
  const cur = startPrice(trim);
  let best = null;
  for (const t of variant.trims) {
    const p = startPrice(t);
    if (p > cur && (!best || p < startPrice(best))) best = t;
  }
  if (!best) return null;
  // wants gained
  const gainedWants = best.satisfies.filter(w => !trim.satisfies.includes(w)).map(w => WANT_BY_ID[w] && WANT_BY_ID[w].label).filter(Boolean);
  // notable raw features gained
  const have = new Set(Object.keys(trim.features));
  const gainedFeat = Object.keys(best.features)
    .filter(sid => !have.has(sid))
    .map(sid => FC[sid] && FC[sid].name)
    .filter(n => n && NOTABLE.test(n));
  const seen = new Set(gainedWants.map(x => x.toLowerCase()));
  const extra = [];
  for (const n of gainedFeat) { const k = n.toLowerCase(); if (![...seen].some(s => k.includes(s) || s.includes(k))) { extra.push(n); seen.add(k); } }
  const gained = [...gainedWants, ...extra].slice(0, 6);
  const dp = startPrice(best) - cur;
  const pa = (trimPrice(best).payment || 0) - (trimPrice(trim).payment || 0);
  return { trim: best, delta: dp, payDelta: pa, gained };
}

function upsellHTML(model, variant, trim) {
  const up = nextTrimUp(model, variant, trim);
  if (!up || up.delta <= 0) return "";
  const gained = up.gained.length ? `<div class="gained">Step up to <b>${variant.name} ${up.trim.name}</b> and your client also gains: ${up.gained.map(g => `<b>${g}</b>`).join(", ")}.</div>` : "";
  const pay = up.payDelta > 0 ? ` · ~${money(up.payDelta)}/mo more` : "";
  return `<div class="upsell">
      <div class="u-h">▲ Upsell opportunity</div>
      <div class="u-row"><span class="u-name">${variant.name} ${up.trim.name}</span>
        <span class="u-delta">+${money(up.delta)}${pay}</span></div>
      ${gained}
    </div>`;
}

// cheapest trim (same variant first, then same model) that adds a given want
function cheapestAdding(model, variant, trim, wid) {
  const cands = [];
  for (const t of variant.trims) if (t.satisfies.includes(wid) && startPrice(t) > startPrice(trim)) cands.push({ v: variant, t });
  if (!cands.length) for (const v of model.variants) for (const t of v.trims) if (t.satisfies.includes(wid)) cands.push({ v, t });
  cands.sort((a, b) => startPrice(a.t) - startPrice(b.t));
  return cands[0];
}

/* ---------- match rendering ---------- */
function wantTags(model, trim, musts, nices) {
  const tags = [];
  for (const w of musts) {
    const hit = trim.satisfies.includes(w);
    const ex = hit && isExclusive(model.slug, w);
    tags.push(`<span class="tg ${hit ? "hit" + (ex ? " excl" : "") : "miss"}">${hit ? (ex ? "★ " : "✓ ") : "✕ "}${WANT_BY_ID[w].label}</span>`);
  }
  for (const w of nices) {
    const hit = trim.satisfies.includes(w);
    if (hit) { const ex = isExclusive(model.slug, w); tags.push(`<span class="tg nicehit">${ex ? "★ " : "+ "}${WANT_BY_ID[w].label}</span>`); }
    else tags.push(`<span class="tg">○ ${WANT_BY_ID[w].label}</span>`);
  }
  return `<div class="tags">${tags.join("")}</div>`;
}

function pctClass(p) { return p >= 90 ? "p90" : p >= 80 ? "p80" : p >= 70 ? "p70" : "plow"; }

function cardHTML(entry, musts, nices, opts = {}) {
  const { model, variant, trim } = entry;
  const p = trimPrice(trim);
  const key = cartKey(model, variant, trim);
  const ribbon = opts.ribbon ? `<span class="ribbon">${opts.ribbon}</span>` : "";
  const badge = (opts.pct != null)
    ? `<span class="mpct ${pctClass(opts.pct)}" title="${opts.satN} of ${opts.totN} selected features">${opts.pct}% match · ${opts.satN}/${opts.totN}</span>` : "";
  let why = "";
  if (opts.missWant) {
    const fix = cheapestAdding(model, variant, trim, opts.missWant);
    const fixTxt = fix ? ` — add it with <b>${fix.v.name} ${fix.t.name}</b> (${money(startPrice(fix.t))})` : "";
    why = `<div class="why">One feature away: needs <b>${WANT_BY_ID[opts.missWant].label}</b>${fixTxt}.</div>`;
  }
  return `<div class="card ${opts.best ? "best" : ""}">${ribbon}
    <div class="card-body">
      ${photoHTML(variant, 320, "card-photo")}
      <div class="card-main">
        <div class="card-top">
          <div><div class="card-title">${model.name} <span class="variant">${variant.name} · ${trim.name}</span> ${badge}</div>
            <div class="card-sub">${model.subtitle} · ${variant.ptClass.toUpperCase()}${trim.attrs.drivetrain ? " · " + trim.attrs.drivetrain : ""}${trim.attrs.seats ? " · " + trim.attrs.seats + " seats" : ""}</div></div>
          <div class="price"><div class="amt">${money(p.start)}</div>${payHTML(trim)}</div>
        </div>
        ${wantTags(model, trim, musts, nices)}
        ${why}
        ${opts.upsell ? upsellHTML(model, variant, trim) : ""}
        <div class="card-cta"><button class="btn cart-btn ${inCart(key) ? "in" : ""}" data-cartkey="${key}">${inCart(key) ? "✓ In cart" : "+ Add to cart"}</button></div>
      </div>
    </div>
  </div>`;
}

function renderMatch() {
  const musts = WANTS.map(w => w.id).filter(id => state.wants[id] === "must");
  const nices = WANTS.map(w => w.id).filter(id => state.wants[id] === "nice");
  const head = $("#results-head"), list = $("#results");

  if (!musts.length && !nices.length) {
    lastMatch = null;
    head.innerHTML = "<h2>Recommendations</h2>";
    list.innerHTML = `<div class="empty"><div class="big">◆</div>
      Mark what matters to your client on the left.<br>Tap once for a <b>must-have</b>, twice for a <b>nice-to-have</b>.<br><br>
      <span style="color:var(--mut2)">★ = feature exclusive to higher trims · ▲ = upsell opportunity shown on every match</span></div>`;
    return;
  }

  const sel = musts.concat(nices), totN = sel.length;
  const all = filteredTrims();
  const scored = all.map(e => {
    const missMust = musts.filter(w => !e.trim.satisfies.includes(w));
    const niceHits = nices.filter(w => e.trim.satisfies.includes(w));
    const satN = totN - missMust.length - (nices.length - niceHits.length);
    return { ...e, missMust, niceHits, satN, pct: Math.round(satN / totN * 100), full: missMust.length === 0 };
  });

  const full = scored.filter(s => s.full)
    .sort((a, b) => (b.satN - a.satN) || (startPrice(a.trim) - startPrice(b.trim)));
  // partial matches that still cover ≥70% of everything the client asked for
  const partial = scored.filter(s => !s.full && s.pct >= 70)
    .sort((a, b) => (a.missMust.length - b.missMust.length) || (b.pct - a.pct) || (startPrice(a.trim) - startPrice(b.trim)));

  lastMatch = { musts, nices, full, partial };
  head.innerHTML = `<div><h2>Recommendations</h2>
      <div class="count">${full.length ? `${full.length} trim${full.length !== 1 ? "s" : ""} meet every must-have` : "No trim meets every must-have"}${partial.length ? ` · ${partial.length} partial match${partial.length !== 1 ? "es" : ""} (≥70%)` : ""}.</div></div>
    <div class="head-actions">
      <input id="p-client" placeholder="Client name (optional)" value="${esc(state.print.client)}" style="width:140px">
      <input id="p-rep" placeholder="Prepared by (optional)" value="${esc(state.print.rep)}" style="width:130px">
      <button id="btn-print" class="btn print">📄 Client summary</button>
    </div>
    <div class="paybar">
      <span class="pl">Payments</span>
      <label>Lease <span class="adv">advertised</span></label>
      <label>Finance APR <input id="pay-apr" type="number" step="0.01" min="0" value="${state.pay.apr}">%</label>
      <label>Term <input id="pay-term" type="number" min="12" step="6" value="${state.pay.term}">mo</label>
      <label>Down <input id="pay-down" type="number" min="0" step="500" value="${state.pay.down}">$</label>
    </div>`;
  const ci = $("#p-client"), ri = $("#p-rep");
  ci.addEventListener("input", () => state.print.client = ci.value);
  ri.addEventListener("input", () => state.print.rep = ri.value);
  $("#btn-print").addEventListener("click", printSummary);
  $("#pay-apr").addEventListener("change", e => { state.pay.apr = Math.max(0, +e.target.value || 0); renderMatch(); });
  $("#pay-term").addEventListener("change", e => { state.pay.term = Math.max(12, +e.target.value || 60); renderMatch(); });
  $("#pay-down").addEventListener("change", e => { state.pay.down = Math.max(0, +e.target.value || 0); renderMatch(); });

  let html = "";
  if (full.length) {
    full.slice(0, 10).forEach((s, i) => html += cardHTML(s, musts, nices,
      { best: i === 0, ribbon: i === 0 ? "Top match — meets all must-haves" : "", upsell: true, pct: s.pct, satN: s.satN, totN }));
    if (full.length > 10) html += `<div class="hint">+ ${full.length - 10} more qualifying trims (narrow with filters).</div>`;
  } else {
    html += `<div class="empty" style="padding:30px"><div class="big">∅</div>No single trim meets all ${musts.length} must-have${musts.length !== 1 ? "s" : ""}. The closest matches are below — or relax a must-have.</div>`;
  }

  // partial tiers: 90%+, 80–89%, 70–79%
  const tiers = [
    { lo: 90, hi: 101, label: "Strong matches · 90%+" },
    { lo: 80, hi: 90, label: "Good matches · 80–89%" },
    { lo: 70, hi: 80, label: "Worth a look · 70–79%" },
  ];
  for (const t of tiers) {
    const bucket = partial.filter(s => s.pct >= t.lo && s.pct < t.hi);
    if (!bucket.length) continue;
    html += `<div class="section-label">${t.label} <span style="color:var(--mut2)">(${bucket.length})</span></div>`;
    bucket.slice(0, 6).forEach(s => html += cardHTML(s, musts, nices,
      { upsell: false, pct: s.pct, satN: s.satN, totN, missWant: s.missMust.length === 1 ? s.missMust[0] : null }));
    if (bucket.length > 6) html += `<div class="hint">+ ${bucket.length - 6} more in this tier.</div>`;
  }
  list.innerHTML = html;
  list.querySelectorAll(".cart-btn").forEach(b =>
    b.addEventListener("click", () => { toggleCart(b.dataset.cartkey); renderMatch(); }));
}

/* ---------- client-facing print / PDF summary ---------- */
function printTrimBlock(entry, musts, nices, opts = {}) {
  const { model, variant, trim } = entry;
  const p = trimPrice(trim);
  const lease = p.payment ? `Lease ${money(p.payment)}/mo · ${p.rate}% · ${p.term} mo · ${(p.km / 1000)}k km/yr` : "Lease n/a";
  const fm = financeMonthly(trim);
  const fin = fm ? `Finance ~${money(fm)}/mo · ${state.pay.apr}% · ${state.pay.term} mo` : "";
  const rows = [];
  for (const w of musts) {
    const hit = trim.satisfies.includes(w);
    rows.push(`<div class="row ${hit ? "yes" : "no"}">${hit ? "✓" : "✕"} ${esc(WANT_BY_ID[w].label)}${hit && isExclusive(model.slug, w) ? " ★" : ""}</div>`);
  }
  const niceHit = nices.filter(w => trim.satisfies.includes(w));
  if (niceHit.length) rows.push(`<div class="row yes">✓ Also includes: ${niceHit.map(w => esc(WANT_BY_ID[w].label)).join(", ")}</div>`);
  const up = nextTrimUp(model, variant, trim);
  const upHTML = (up && up.delta > 0 && up.gained.length)
    ? `<div class="p-up">Consider stepping up to <b>${esc(variant.name)} ${esc(up.trim.name)}</b> (+${money(up.delta)}): adds ${up.gained.map(esc).join(", ")}.</div>` : "";
  const war = warrantyFor(variant).map(w => `${esc(w.name)} ${esc(w.term)}`).join(" · ");
  const img = variant.image ? `<div class="p-photo"><img src="${imgUrl(variant.image, 480)}"></div>` : "";
  return `<div class="p-trim ${opts.rec ? "p-rec" : ""}">
    ${opts.rec ? `<div class="p-rib">RECOMMENDED</div>` : ""}
    <div class="p-trim-top">
      <div><div class="pt-name">${esc(model.name)} ${esc(variant.name)} · ${esc(trim.name)}</div>
        <div class="pt-sub">${esc(model.subtitle)} · ${esc(variant.ptClass.toUpperCase())}${trim.attrs.drivetrain ? " · " + esc(trim.attrs.drivetrain) : ""}${trim.attrs.seats ? " · " + trim.attrs.seats + " seats" : ""}</div></div>
      <div class="pt-price"><div class="amt">${money(p.start)}</div><div class="ls"><b>${lease}</b></div>${fin ? `<div class="ls">${fin}</div>` : ""}</div>
    </div>
    ${img}
    <div class="p-tags">${rows.join("")}</div>
    ${upHTML}
    <div class="p-war"><b>Warranty:</b> ${war}</div>
  </div>`;
}

function printSummary() {
  if (!lastMatch) return;
  const { musts, nices, full, partial } = lastMatch;
  const area = $("#print-area");
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const mustList = musts.map(w => WANT_BY_ID[w].label).join(", ") || "—";
  const niceList = nices.map(w => WANT_BY_ID[w].label).join(", ") || "—";

  let blocks = "";
  if (full.length) {
    full.slice(0, 5).forEach((s, i) => blocks += printTrimBlock(s, musts, nices, { rec: i === 0 }));
  } else if (partial.length) {
    blocks += `<div class="p-intro">No single trim meets every must-have; these are the closest matches (${partial[0].pct}% and below):</div>`;
    partial.slice(0, 4).forEach((s, i) => blocks += printTrimBlock(s, musts, nices, { rec: i === 0 }));
  } else {
    blocks = `<div class="p-intro">No close matches — consider relaxing a must-have.</div>`;
  }

  area.innerHTML = `
    <div class="p-head">
      <div><div class="pl">LEXUS</div><div class="psub">Vehicle Recommendations</div></div>
      <div class="pmeta">${state.print.client ? "<b>Prepared for:</b> " + esc(state.print.client) + "<br>" : ""}
        ${state.print.rep ? "Lexus consultant: " + esc(state.print.rep) + "<br>" : ""}
        ${today} · Pricing region: ${esc(state.province)}</div>
    </div>
    <div class="p-intro">Based on the priorities we discussed — <b>must-haves:</b> ${esc(mustList)}${nices.length ? `; <b>nice-to-haves:</b> ${esc(niceList)}` : ""} — here ${full.length === 1 ? "is the option" : "are the options"} best suited to you. ★ marks features reserved for higher trims.</div>
    ${blocks}
    <div class="p-foot">${esc(DATA.meta.finance.note)} ${esc(DATA.meta.priceNote)} ${esc(DATA.meta.warranty.note)} Prices in ${esc(DATA.meta.currency)}. Data current as of ${esc(DATA.meta.generated)} (lexus.ca). This summary is for discussion purposes and is not a binding offer.</div>`;
  window.print();
}

/* ---------- browse ---------- */
function renderBrowse() {
  const listEl = $("#model-list");
  listEl.innerHTML = "";
  for (const m of DATA.models) {
    const cheapest = Math.min(...m.variants.flatMap(v => v.trims.map(startPrice)));
    const it = el("button", "model-item" + (m.slug === state.browseSlug ? " active" : ""),
      `<div class="mn">${m.name}</div><div class="mc">${m.subtitle}</div><div class="mp">from ${money(cheapest)}</div>`);
    it.addEventListener("click", () => { state.browseSlug = m.slug; state.browseVariant = 0; state.browseSpecFilter = ""; renderBrowse(); });
    listEl.appendChild(it);
  }
  renderBrowseDetail();
}

function renderBrowseDetail() {
  const m = DATA.models.find(x => x.slug === state.browseSlug);
  const detail = $("#browse-detail");
  const v = m.variants[Math.min(state.browseVariant, m.variants.length - 1)];

  const vtabs = m.variants.map((vv, i) =>
    `<button class="vtab ${i === state.browseVariant ? "active" : ""}" data-v="${i}">${vv.name}</button>`).join("");

  const priceStrip = v.trims.map(t => {
    const p = trimPrice(t), fm = financeMonthly(t), key = cartKey(m, v, t);
    return `<div class="price-pill ${t.isBase ? "base" : ""}"><span class="pn">${esc(t.name)}${t.isBase ? " (base)" : ""}</span><br><span class="pp">${money(p.start)}</span>
      ${p.payment ? `<br><span class="pn lease">Lease ${money(p.payment)}/mo · ${p.rate}%/${p.term}mo</span>` : ""}
      ${fm ? `<br><span class="pn">Finance ~${money(fm)}/mo · ${state.pay.apr}%/${state.pay.term}mo</span>` : ""}
      <br><button class="pill-add ${inCart(key) ? "in" : ""}" data-cartkey="${key}">${inCart(key) ? "✓ in cart" : "+ cart"}</button></div>`;
  }).join("");

  const warRows = warrantyFor(v).map(w => `<div class="war-row"><span>${esc(w.name)}</span><span>${esc(w.term)}</span></div>`).join("");
  const warBlock = `<div class="warranty"><div class="war-h">Warranty &amp; coverage — ${esc(v.ptClass.toUpperCase())}</div>${warRows}
    <div class="war-note">${esc(DATA.meta.warranty.note)}</div></div>`;

  const a = v.trims[0].attrs;
  const attrCells = [
    ["Powertrain", v.powertrain + (v.electrified ? " · electrified" : "")],
    ["Drivetrain", a.drivetrain || "—"],
    ["Seats", a.seats || "—"],
    ["Horsepower (kW)", a.horsepower || "—"],
    ["Torque (lb-ft)", a.torque || "—"],
    ["Fuel L/100km", a.fuel_l100 || "—"],
    ["Electric range (km)", a.ev_range || "—"],
    ["Towing (kg)", a.towing_kg || "—"],
    ["Cargo (L)", a.cargo || "—"],
  ].filter(c => c[1] && c[1] !== "—").map(c => `<div class="attr"><div class="k">${c[0]}</div><div class="v">${c[1]}</div></div>`).join("");

  // spec comparison table
  const filter = state.browseSpecFilter.toLowerCase();
  const groups = {}; // group -> sub -> [sid]
  const present = new Set();
  for (const t of v.trims) for (const sid in t.features) present.add(sid);
  for (const sid of present) {
    const meta = FC[sid]; if (!meta) continue;
    if (filter && !meta.name.toLowerCase().includes(filter)) continue;
    ((groups[meta.group] = groups[meta.group] || {})[meta.sub] = (groups[meta.group]?.[meta.sub] || [])).push(sid);
  }
  let rows = "";
  const groupOrder = ["Exterior", "Interior", "Infotainment", "Safety & Convenience", "Powertrain & Mechanical", "Dimensions"];
  const gks = Object.keys(groups).sort((x, y) => (groupOrder.indexOf(x) + 99) % 99 - (groupOrder.indexOf(y) + 99) % 99);
  for (const g of gks) {
    for (const sub of Object.keys(groups[g]).sort()) {
      rows += `<tr class="grp-row"><td colspan="${v.trims.length + 1}">${g} · ${sub}</td></tr>`;
      const sids = [...new Set(groups[g][sub])].sort((x, y) => FC[x].name.localeCompare(FC[y].name));
      for (const sid of sids) {
        let cells = "";
        for (const t of v.trims) {
          if (sid in t.features) {
            const val = t.features[sid];
            cells += val ? `<td class="val">${val}</td>` : `<td class="y">✓</td>`;
          } else cells += `<td class="n">–</td>`;
        }
        rows += `<tr><td>${FC[sid].name}</td>${cells}</tr>`;
      }
    }
  }

  detail.innerHTML = `
    <div class="results-head"><h2>${m.name} <span style="color:var(--mut);font-weight:400">${m.year} · ${m.subtitle}</span></h2>
      <div class="head-actions"><button id="btn-print-spec" class="btn print">📄 Print spec sheet</button></div></div>
    <div class="variant-tabs">${vtabs}</div>
    ${photoHTML(v, 720, "browse-hero")}
    <div class="paybar browse-pay">
      <span class="pl">Finance estimate</span>
      <label>APR <input id="bpay-apr" type="number" step="0.01" min="0" value="${state.pay.apr}">%</label>
      <label>Term <input id="bpay-term" type="number" min="12" step="6" value="${state.pay.term}">mo</label>
      <span class="paynote">Lease figures are the advertised offer.</span>
    </div>
    <div class="price-strip">${priceStrip}</div>
    <div class="attrs">${attrCells}</div>
    ${warBlock}
    <div class="toolbar"><input id="spec-filter" type="search" placeholder="Filter features… (e.g. heated, audio, wheels)" value="${state.browseSpecFilter.replace(/"/g, "&#34;")}">
      <span class="hint">${present.size} features · ${v.trims.length} trims</span></div>
    <div style="overflow:auto;max-height:60vh">
    <table class="trim-table"><thead><tr><th>Feature</th>${v.trims.map(t => `<th>${t.name}</th>`).join("")}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${v.trims.length + 1}" style="color:var(--mut);padding:20px">No features match “${filter}”.</td></tr>`}</tbody></table></div>`;

  detail.querySelectorAll(".vtab").forEach(b => b.addEventListener("click", () => { state.browseVariant = +b.dataset.v; state.browseSpecFilter = ""; renderBrowseDetail(); }));
  $("#btn-print-spec").addEventListener("click", () => printSpecSheet(m, v));
  detail.querySelectorAll(".pill-add").forEach(b =>
    b.addEventListener("click", () => { toggleCart(b.dataset.cartkey); renderBrowseDetail(); }));
  $("#bpay-apr").addEventListener("change", e => { state.pay.apr = Math.max(0, +e.target.value || 0); renderBrowseDetail(); });
  $("#bpay-term").addEventListener("change", e => { state.pay.term = Math.max(12, +e.target.value || 60); renderBrowseDetail(); });
  const sf = $("#spec-filter");
  if (sf) sf.addEventListener("input", () => { state.browseSpecFilter = sf.value; const pos = sf.selectionStart; renderBrowseDetail(); const n = $("#spec-filter"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
}

function printSpecSheet(m, v) {
  const area = $("#print-area");
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  // full (unfiltered) grouped feature set
  const groups = {}, present = new Set();
  for (const t of v.trims) for (const sid in t.features) present.add(sid);
  for (const sid of present) {
    const meta = FC[sid]; if (!meta) continue;
    (groups[meta.group] = groups[meta.group] || {});
    (groups[meta.group][meta.sub] = groups[meta.group][meta.sub] || []).push(sid);
  }
  const order = ["Exterior", "Interior", "Infotainment", "Safety & Convenience", "Powertrain & Mechanical", "Dimensions"];
  const gks = Object.keys(groups).sort((x, y) => (order.indexOf(x) + 99) % 99 - (order.indexOf(y) + 99) % 99);
  let rows = "";
  for (const g of gks) for (const sub of Object.keys(groups[g]).sort()) {
    rows += `<tr class="g"><td colspan="${v.trims.length + 1}">${esc(g)} · ${esc(sub)}</td></tr>`;
    for (const sid of [...new Set(groups[g][sub])].sort((a, b) => FC[a].name.localeCompare(FC[b].name))) {
      let cells = "";
      for (const t of v.trims) cells += (sid in t.features)
        ? (t.features[sid] ? `<td class="v">${esc(t.features[sid])}</td>` : `<td class="y">✓</td>`)
        : `<td class="n">–</td>`;
      rows += `<tr><td>${esc(FC[sid].name)}</td>${cells}</tr>`;
    }
  }
  const priceRow = v.trims.map(t => `<td><b>${money(startPrice(t))}</b></td>`).join("");
  area.innerHTML = `
    <div class="p-head"><div><div class="pl">LEXUS</div><div class="psub">${esc(m.name)} ${esc(v.name)} — Specifications</div></div>
      <div class="pmeta">${today} · Pricing region: ${esc(state.province)}</div></div>
    ${v.image ? `<div class="p-photo"><img src="${imgUrl(v.image, 560)}"></div>` : ""}
    <table class="p-spec"><thead><tr><th>Feature</th>${v.trims.map(t => `<th>${esc(t.name)}</th>`).join("")}</tr>
      <tr class="g"><td>Starting price (${esc(state.province)})</td>${priceRow}</tr></thead>
      <tbody>${rows}</tbody></table>
    <div class="p-foot">${esc(DATA.meta.priceNote)} Data current as of ${esc(DATA.meta.generated)} (lexus.ca).</div>`;
  window.print();
}

/* ---------- feature finder ---------- */
// name (lower) -> {label, sids:Set, wantId?}
let FINDER_INDEX = null;
function buildFinderIndex() {
  if (FINDER_INDEX) return FINDER_INDEX;
  const idx = new Map();
  for (const sid in FC) {
    const nm = FC[sid].name, key = nm.toLowerCase();
    if (!idx.has(key)) idx.set(key, { label: nm, sids: new Set(), wantId: null });
    idx.get(key).sids.add(sid);
  }
  for (const w of WANTS) {
    const key = "want:" + w.id;
    idx.set(key, { label: w.label + "  (curated need)", sids: new Set(), wantId: w.id });
  }
  FINDER_INDEX = idx;
  return idx;
}

function keyLabel(key) { const it = buildFinderIndex().get(key); return it ? it.label.replace("  (curated need)", "") : key; }
function finderPredicate(key) {
  const it = buildFinderIndex().get(key);
  if (!it) return () => false;
  return it.wantId ? (t => t.satisfies.includes(it.wantId)) : (t => [...it.sids].some(s => s in t.features));
}
function addFinder(key) { if (!state.finder.sel.includes(key)) state.finder.sel.push(key); state.finder.q = ""; renderFinderResults(); }
function removeFinder(key) { state.finder.sel = state.finder.sel.filter(k => k !== key); renderFinderResults(); }

const POPULAR = ["want:mark_levinson", "want:pano_roof", "want:heated_wheel", "want:hud", "want:third_row",
  "want:awd", "want:massage", "want:towing", "want:surround_cam", "want:cooled_seats", "want:captain", "want:big_wheels"];

function renderFinder() {
  const input = $("#finder-input");
  if (!input.dataset.init) {
    input.dataset.init = "1";
    input.addEventListener("input", () => { state.finder.q = input.value.trim(); renderFinderResults(); });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { const first = document.querySelector("#finder-suggest .sg[data-k]"); if (first) addFinder(first.dataset.k); }
    });
  }
  renderFinderResults();
}

function renderFinderResults() {
  const sug = $("#finder-suggest"), res = $("#finder-results");
  const sel = state.finder.sel;
  // selected chips + match-mode toggle
  let bar = sel.map(k => `<button class="sg sel" data-rm="${esc(k)}">${esc(keyLabel(k))} ✕</button>`).join("");
  if (sel.length > 1) {
    bar += `<span class="mode-toggle">Match
      <button class="mt ${state.finder.mode === "all" ? "on" : ""}" data-mode="all">ALL</button>
      <button class="mt ${state.finder.mode === "any" ? "on" : ""}" data-mode="any">ANY</button></span>`;
  }
  // typeahead OR popular
  const q = state.finder.q.toLowerCase();
  let chips = "";
  if (q.length >= 2) {
    const matches = [];
    for (const [k, v] of buildFinderIndex()) if (!sel.includes(k) && v.label.toLowerCase().includes(q)) matches.push([k, v]);
    matches.sort((a, b) => (a[1].wantId ? 0 : 1) - (b[1].wantId ? 0 : 1) || a[1].label.length - b[1].label.length);
    chips = matches.length
      ? matches.slice(0, 18).map(([k, v]) => `<button class="sg" data-k="${esc(k)}">+ ${esc(v.label)}</button>`).join("")
      : `<span class="hint">No feature matches “${esc(state.finder.q)}”.</span>`;
  } else {
    chips = `<span class="poplabel">Popular:</span>` +
      POPULAR.filter(k => !sel.includes(k)).map(k => `<button class="sg" data-k="${esc(k)}">+ ${esc(keyLabel(k))}</button>`).join("");
  }
  sug.innerHTML = (bar ? `<div class="sel-bar">${bar}</div>` : "") + `<div class="sg-row">${chips}</div>`;
  sug.querySelectorAll(".sg[data-k]").forEach(b => b.addEventListener("click", () => addFinder(b.dataset.k)));
  sug.querySelectorAll(".sg[data-rm]").forEach(b => b.addEventListener("click", () => removeFinder(b.dataset.rm)));
  sug.querySelectorAll(".mt").forEach(b => b.addEventListener("click", () => { state.finder.mode = b.dataset.mode; renderFinderResults(); }));

  // results
  if (!sel.length) {
    res.innerHTML = `<div class="empty" style="padding:40px"><div class="big">🔍</div>Add one or more features above to see every vehicle and trim that delivers them — and the cheapest way in.</div>`;
    return;
  }
  const preds = sel.map(finderPredicate);
  const test = state.finder.mode === "all" ? (t => preds.every(p => p(t))) : (t => preds.some(p => p(t)));
  const byModel = [];
  for (const m of DATA.models) {
    const hits = [];
    for (const v of m.variants) for (const t of v.trims) if (test(t)) hits.push({ v, t });
    if (hits.length) { hits.sort((a, b) => startPrice(a.t) - startPrice(b.t)); byModel.push({ model: m, hits }); }
  }
  byModel.sort((a, b) => startPrice(a.hits[0].t) - startPrice(b.hits[0].t));

  const modeTxt = sel.length > 1 ? (state.finder.mode === "all" ? "all " : "any of ") : "";
  if (!byModel.length) {
    res.innerHTML = `<div class="empty" style="padding:30px">No current trim has ${modeTxt}${sel.length} selected feature${sel.length !== 1 ? "s" : ""}${state.finder.mode === "all" && sel.length > 1 ? " together — try ANY" : ""}.</div>`;
    return;
  }
  const totalTrims = byModel.reduce((a, m) => a + m.hits.length, 0);
  let html = `<h3 style="margin:6px 0 10px">${modeTxt ? "Vehicles with " + modeTxt : ""}${sel.map(k => `<b>${esc(keyLabel(k))}</b>`).join(state.finder.mode === "all" ? " + " : " / ")} — ${totalTrims} trim${totalTrims !== 1 ? "s" : ""} across ${byModel.length} model${byModel.length !== 1 ? "s" : ""}</h3>`;
  for (const mm of byModel) {
    const cheapest = mm.hits[0];
    const trimList = mm.hits.slice(0, 8).map(h => `${h.v.name} ${h.t.name}`).join(" · ");
    html += `<div class="finder-card">
      ${photoHTML(cheapest.v, 240, "finder-photo")}
      <div class="fmid"><div class="fm">${esc(mm.model.name)} <span style="color:var(--mut);font-weight:400;font-size:12px">${esc(mm.model.subtitle)}</span></div>
        <div class="ft">${mm.hits.length} trim${mm.hits.length !== 1 ? "s" : ""}: ${esc(trimList)}${mm.hits.length > 8 ? " …" : ""}</div></div>
      <div class="ff"><div class="from">from ${money(startPrice(cheapest.t))}</div>
        <div class="cnt">${esc(cheapest.v.name)} ${esc(cheapest.t.name)}</div></div>
    </div>`;
  }
  res.innerHTML = html;
}

/* ---------- cart / stock cross-reference ---------- */
const condClass = u => { const c = (u.condition || "New").toLowerCase(); return c === "new" ? "new" : /demo/.test(c) ? "demo" : /cert/.test(c) ? "cpo" : "used"; };
const condLabel = u => { const c = (u.condition || "New").toLowerCase(); return c === "new" ? "NEW" : /demo/.test(c) ? "DEMO" : /cert/.test(c) ? "CPO" : "USED"; };
const isNewUnit = u => (u.condition || "New").toLowerCase() === "new";

function unitRow(u) {
  const yk = !isNewUnit(u)
    ? `<span class="u-yk">${u.year ? u.year : ""}${u.year && u.odometer ? " · " : ""}${u.odometer ? Math.round(u.odometer).toLocaleString("en-CA") + " km" : ""}</span>` : "";
  return `<div class="unit">
      <span class="u-cond ${condClass(u)}">${condLabel(u)}</span>
      <span class="u-stat ${(/stock/i).test(u.status) ? "ok" : "transit"}">${esc(u.status || "—")}</span>
      <span class="u-col">${esc(u.exterior || "—")}</span>
      ${yk}
      <span class="u-meta">Stock ${esc(u.stock || "—")}${u.vin ? " · VIN …" + esc(String(u.vin).slice(-6)) : ""}</span>
      <span class="u-price">${u.price ? money(u.price) : ""}</span>
      ${u.url ? `<a class="u-link" href="${esc(u.url)}" target="_blank" rel="noopener">View ↗</a>` : ""}
    </div>`;
}

function stockHTML(model, variant, trim) {
  if (!INV.units.length) return `<div class="stock none">Inventory snapshot not loaded.</div>`;
  const { exact, alt } = matchUnits(model, variant, trim);
  const exNew = exact.filter(isNewUnit), exUsed = exact.filter(u => !isNewUnit(u));
  let h = `<div class="stock">`;

  if (exNew.length) h += `<div class="stock-h ok">● In stock — exact trim (${exNew.length})</div>${exNew.map(unitRow).join("")}`;
  if (exUsed.length) h += `<div class="stock-h cpo">◆ Pre-owned &amp; demo — same trim (${exUsed.length})</div>${exUsed.map(unitRow).join("")}`;
  if (!exact.length) h += `<div class="stock-h none">○ This exact trim isn't in stock</div>`;

  // alternatives (other trims of this model) — new and pre-owned
  if (alt.length) {
    const altNew = alt.filter(isNewUnit), altUsed = alt.filter(u => !isNewUnit(u));
    h += `<div class="stock-alt">Other ${esc(model.name)} at ${esc(INV.meta.dealer)} — ${altNew.length} new · ${altUsed.length} pre-owned:</div>`;
    h += [...altNew, ...altUsed].slice(0, 5).map(unitRow).join("");
    if (alt.length > 5) h += `<div class="hint">+ ${alt.length - 5} more ${esc(model.name)} units.</div>`;
  } else if (!exact.length) {
    h += `<div class="hint">No ${esc(model.name)} currently in stock — ask the dealer to locate or factory-order.</div>`;
  }
  return h + `</div>`;
}

function renderCart() {
  const head = $("#cart-head"), list = $("#cart-list");
  const items = state.cart.map(resolveKey).filter(Boolean);
  const banner = INV.meta.sample
    ? `<div class="sample-banner">⚠ Showing <b>SAMPLE</b> inventory. Run <code>scripts/scrape_inventory.py</code> from an un-blocked network to load live ${esc(INV.meta.dealer || "dealer")} stock.</div>`
    : "";
  const dealerline = INV.meta.dealer
    ? `Stock checked against <b>${esc(INV.meta.dealer)}</b>${INV.meta.city ? " · " + esc(INV.meta.city) : ""} · snapshot ${esc(INV.meta.scraped || "")} (${INV.units.length} units)`
    : "No dealer inventory loaded.";

  if (!items.length) {
    head.innerHTML = `<div><h2>Cart</h2><div class="count">${dealerline}</div></div>`;
    list.innerHTML = banner + `<div class="empty"><div class="big">🛒</div>No vehicles added yet.<br>Add trims from <b>Match by needs</b> (or any result) to check Northwest Lexus stock and build a quote.</div>`;
    return;
  }
  head.innerHTML = `<div><h2>Cart <span style="color:var(--mut);font-weight:400">· ${items.length} vehicle${items.length !== 1 ? "s" : ""}</span></h2>
      <div class="count">${dealerline}</div></div>
    <div class="head-actions">
      <button id="cart-print" class="btn print">📄 Print quote</button>
      <button id="cart-clear" class="btn ghost">Clear cart</button>
    </div>`;
  $("#cart-clear").addEventListener("click", () => { state.cart = []; try { localStorage.removeItem("lexusCart"); } catch (e) {} updateCartCount(); renderCart(); });
  $("#cart-print").addEventListener("click", printCart);

  let html = banner;
  for (const { model, variant, trim } of items) {
    const key = cartKey(model, variant, trim), p = trimPrice(trim);
    html += `<div class="card cart-card">
      <div class="card-body">
        ${photoHTML(variant, 320, "card-photo")}
        <div class="card-main">
          <div class="card-top">
            <div><div class="card-title">${esc(model.name)} <span class="variant">${esc(variant.name)} · ${esc(trim.name)}</span></div>
              <div class="card-sub">${esc(model.subtitle)} · ${esc(variant.ptClass.toUpperCase())}${trim.attrs.drivetrain ? " · " + esc(trim.attrs.drivetrain) : ""}</div></div>
            <div class="price"><div class="amt">${money(p.start)}</div>${payHTML(trim)}</div>
          </div>
          ${stockHTML(model, variant, trim)}
          <div class="card-cta"><button class="btn ghost cart-rm" data-cartkey="${key}">Remove</button></div>
        </div>
      </div>
    </div>`;
  }
  list.innerHTML = html;
  list.querySelectorAll(".cart-rm").forEach(b =>
    b.addEventListener("click", () => { toggleCart(b.dataset.cartkey); renderCart(); }));
}

function printCart() {
  const items = state.cart.map(resolveKey).filter(Boolean);
  if (!items.length) return;
  const area = $("#print-area");
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  let blocks = "";
  for (const { model, variant, trim } of items) {
    const p = trimPrice(trim), fm = financeMonthly(trim);
    const { exact, alt } = matchUnits(model, variant, trim);
    const exNew = exact.filter(isNewUnit), exUsed = exact.filter(u => !isNewUnit(u));
    const altUsed = alt.filter(u => !isNewUnit(u));
    let stock;
    if (exact.length) {
      const parts = exact.slice(0, 4).map(u => `${condLabel(u)} ${esc(u.exterior || "")}${!isNewUnit(u) && u.odometer ? " " + Math.round(u.odometer / 1000) + "k km" : ""} #${esc(u.stock || "")}${u.price ? " " + money(u.price) : ""}`);
      stock = `<div class="p-stock yes">In stock (${exNew.length} new${exUsed.length ? `, ${exUsed.length} pre-owned` : ""}): ${parts.join(" · ")}</div>`;
    } else {
      stock = `<div class="p-stock no">Exact trim not in stock${alt.length ? ` · ${alt.length} other ${esc(model.name)} available (incl. ${altUsed.length} pre-owned)` : ""}.</div>`;
    }
    blocks += `<div class="p-trim">
      <div class="p-trim-top">
        <div><div class="pt-name">${esc(model.name)} ${esc(variant.name)} · ${esc(trim.name)}</div>
          <div class="pt-sub">${esc(model.subtitle)} · ${esc(variant.ptClass.toUpperCase())}</div></div>
        <div class="pt-price"><div class="amt">${money(p.start)}</div>
          <div class="ls"><b>Lease ${p.payment ? money(p.payment) + "/mo · " + p.rate + "%/" + p.term + "mo" : "n/a"}</b></div>
          ${fm ? `<div class="ls">Finance ~${money(fm)}/mo · ${state.pay.apr}%/${state.pay.term}mo</div>` : ""}</div>
      </div>
      ${variant.image ? `<div class="p-photo"><img src="${imgUrl(variant.image, 480)}"></div>` : ""}
      ${stock}
    </div>`;
  }
  area.innerHTML = `
    <div class="p-head"><div><div class="pl">LEXUS</div><div class="psub">Selected Vehicles${INV.meta.sample ? " — sample stock" : ""}</div></div>
      <div class="pmeta">${state.print.client ? "<b>Prepared for:</b> " + esc(state.print.client) + "<br>" : ""}${today} · ${esc(state.province)}</div></div>
    <div class="p-intro">Vehicles selected for your consideration, with availability at ${esc(INV.meta.dealer || "the dealer")}.</div>
    ${blocks}
    <div class="p-foot">${esc(DATA.meta.finance.note)} ${esc(DATA.meta.priceNote)} Stock as of ${esc(INV.meta.scraped || "—")}${INV.meta.sample ? " (SAMPLE data)" : ""}. Not a binding offer.</div>`;
  window.print();
}

/* ---------- render dispatch ---------- */
function renderAll() {
  if (state.mode === "match") { renderWants(); renderMatch(); }
  else if (state.mode === "browse") renderBrowse();
  else if (state.mode === "finder") renderFinder();
  else if (state.mode === "cart") renderCart();
}

initControls();
updateCartCount();
renderAll();
})();
