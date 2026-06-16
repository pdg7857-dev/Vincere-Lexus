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
};

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const money = n => (n == null ? "—" : "$" + Math.round(n).toLocaleString("en-CA"));

function trimPrice(trim) {
  const p = trim.price[state.province];
  if (p) return p;
  const any = Object.values(trim.price)[0];
  return any || {};
}
function startPrice(trim) { const p = trimPrice(trim); return p.start != null ? p.start : Infinity; }

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
  ["match", "browse", "finder"].forEach(m => $("#mode-" + m).classList.toggle("hidden", m !== mode));
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

function cardHTML(entry, musts, nices, opts = {}) {
  const { model, variant, trim } = entry;
  const p = trimPrice(trim);
  const lease = p.payment ? `${money(p.payment)}/mo · ${p.rate}% · ${p.term}mo` : "";
  const ribbon = opts.ribbon ? `<span class="ribbon">${opts.ribbon}</span>` : "";
  let why = "";
  if (opts.missWant) {
    const fix = cheapestAdding(model, variant, trim, opts.missWant);
    const fixTxt = fix ? ` — add it with <b>${fix.v.name} ${fix.t.name}</b> (${money(startPrice(fix.t))})` : "";
    why = `<div class="why">One feature away: needs <b>${WANT_BY_ID[opts.missWant].label}</b>${fixTxt}.</div>`;
  }
  return `<div class="card ${opts.best ? "best" : ""}">${ribbon}
    <div class="card-top">
      <div><div class="card-title">${model.name} <span class="variant">${variant.name} · ${trim.name}</span></div>
        <div class="card-sub">${model.subtitle} · ${variant.powertrain}${trim.attrs.drivetrain ? " · " + trim.attrs.drivetrain : ""}${trim.attrs.seats ? " · " + trim.attrs.seats + " seats" : ""}</div></div>
      <div class="price"><div class="amt">${money(p.start)}</div><div class="lease">${lease}</div></div>
    </div>
    ${wantTags(model, trim, musts, nices)}
    ${why}
    ${opts.upsell ? upsellHTML(model, variant, trim) : ""}
  </div>`;
}

function renderMatch() {
  const musts = WANTS.map(w => w.id).filter(id => state.wants[id] === "must");
  const nices = WANTS.map(w => w.id).filter(id => state.wants[id] === "nice");
  const head = $("#results-head"), list = $("#results");

  if (!musts.length && !nices.length) {
    head.innerHTML = "<h2>Recommendations</h2>";
    list.innerHTML = `<div class="empty"><div class="big">◆</div>
      Mark what matters to your client on the left.<br>Tap once for a <b>must-have</b>, twice for a <b>nice-to-have</b>.<br><br>
      <span style="color:var(--mut2)">★ = feature exclusive to higher trims · ▲ = upsell opportunity shown on every match</span></div>`;
    return;
  }

  const all = filteredTrims();
  const scored = all.map(e => {
    const missMust = musts.filter(w => !e.trim.satisfies.includes(w));
    const niceHits = nices.filter(w => e.trim.satisfies.includes(w));
    return { ...e, missMust, niceHits, full: missMust.length === 0 };
  });

  const full = scored.filter(s => s.full)
    .sort((a, b) => (b.niceHits.length - a.niceHits.length) || (startPrice(a.trim) - startPrice(b.trim)));
  const near = scored.filter(s => s.missMust.length === 1)
    .sort((a, b) => startPrice(a.trim) - startPrice(b.trim));

  head.innerHTML = `<h2>Recommendations</h2><div class="count">${full.length} trim${full.length !== 1 ? "s" : ""} meet every must-have${near.length ? ` · ${near.length} are one feature away` : ""}.</div>`;

  let html = "";
  if (full.length) {
    const cheapest = full.reduce((a, b) => startPrice(a.trim) <= startPrice(b.trim) ? a : b);
    full.slice(0, 10).forEach((s, i) => {
      const opts = { musts, nices, upsell: true };
      if (i === 0) opts.ribbon = "Top match — most of their wants";
      html += cardHTML(s, musts, nices, { best: i === 0, ribbon: opts.ribbon, upsell: true });
    });
    if (full.length > 10) html += `<div class="hint">+ ${full.length - 10} more qualifying trims (narrow with filters).</div>`;
  } else {
    html += `<div class="empty"><div class="big">∅</div>No single trim meets all ${musts.length} must-haves. See the closest options below, or relax a must-have.</div>`;
  }

  if (near.length) {
    html += `<div class="section-label">One feature away — stretch the budget</div><div class="nearmiss">`;
    near.slice(0, 6).forEach(s => html += cardHTML(s, musts, nices, { missWant: s.missMust[0], upsell: false }));
    html += `</div>`;
  }
  list.innerHTML = html;
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
    const p = trimPrice(t);
    return `<div class="price-pill ${t.isBase ? "base" : ""}"><span class="pn">${t.name}${t.isBase ? " (base)" : ""}</span><br><span class="pp">${money(p.start)}</span>${p.payment ? ` <span class="pn">· ${money(p.payment)}/mo</span>` : ""}</div>`;
  }).join("");

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
    <h2>${m.name} <span style="color:var(--mut);font-weight:400">${m.year} · ${m.subtitle}</span></h2>
    <div class="variant-tabs">${vtabs}</div>
    <div class="price-strip">${priceStrip}</div>
    <div class="attrs">${attrCells}</div>
    <div class="toolbar"><input id="spec-filter" type="search" placeholder="Filter features… (e.g. heated, audio, wheels)" value="${state.browseSpecFilter.replace(/"/g, "&#34;")}">
      <span class="hint">${present.size} features · ${v.trims.length} trims</span></div>
    <div style="overflow:auto;max-height:60vh">
    <table class="trim-table"><thead><tr><th>Feature</th>${v.trims.map(t => `<th>${t.name}</th>`).join("")}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${v.trims.length + 1}" style="color:var(--mut);padding:20px">No features match “${filter}”.</td></tr>`}</tbody></table></div>`;

  detail.querySelectorAll(".vtab").forEach(b => b.addEventListener("click", () => { state.browseVariant = +b.dataset.v; state.browseSpecFilter = ""; renderBrowseDetail(); }));
  const sf = $("#spec-filter");
  if (sf) sf.addEventListener("input", () => { state.browseSpecFilter = sf.value; const pos = sf.selectionStart; renderBrowseDetail(); const n = $("#spec-filter"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
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

function finderMatches(entryKey) {
  const idx = buildFinderIndex();
  const item = idx.get(entryKey);
  if (!item) return null;
  const test = item.wantId
    ? (t => t.satisfies.includes(item.wantId))
    : (t => [...item.sids].some(s => s in t.features));
  const byModel = [];
  for (const m of DATA.models) {
    const hits = [];
    for (const v of m.variants) for (const t of v.trims) if (test(t)) hits.push({ v, t });
    if (hits.length) {
      hits.sort((a, b) => startPrice(a.t) - startPrice(b.t));
      byModel.push({ model: m, hits });
    }
  }
  byModel.sort((a, b) => startPrice(a.hits[0].t) - startPrice(b.hits[0].t));
  return { item, byModel };
}

function renderFinder() {
  const input = $("#finder-input"), sug = $("#finder-suggest"), res = $("#finder-results");
  // popular suggestion chips
  if (!sug.dataset.init) {
    sug.dataset.init = "1";
    const pop = ["want:mark_levinson", "want:pano_roof", "want:heated_wheel", "want:hud", "want:third_row", "want:awd", "want:massage", "want:towing", "want:surround_cam", "want:cooled_seats"];
    pop.forEach(k => { const it = buildFinderIndex().get(k); if (!it) return; const c = el("button", "sg", it.label.replace("  (curated need)", "")); c.addEventListener("click", () => selectFinder(k)); sug.appendChild(c); });
  }
  if (!input.dataset.init) {
    input.dataset.init = "1";
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      res.innerHTML = "";
      if (q.length < 2) return;
      const idx = buildFinderIndex();
      const matches = [];
      for (const [k, v] of idx) if (v.label.toLowerCase().includes(q)) matches.push([k, v]);
      matches.sort((a, b) => (a[1].wantId ? 0 : 1) - (b[1].wantId ? 0 : 1) || a[1].label.length - b[1].label.length);
      res.innerHTML = `<div class="finder-suggest">` +
        matches.slice(0, 16).map(([k, v]) => `<button class="sg" data-k="${k.replace(/"/g, "&#34;")}">${v.label}</button>`).join("") + `</div>`;
      res.querySelectorAll(".sg").forEach(b => b.addEventListener("click", () => selectFinder(b.dataset.k)));
    });
  }
}

function selectFinder(key) {
  $("#finder-input").value = "";
  const r = finderMatches(key);
  const res = $("#finder-results");
  if (!r || !r.byModel.length) { res.innerHTML = `<div class="empty">No current trims offer that.</div>`; return; }
  const totalTrims = r.byModel.reduce((a, m) => a + m.hits.length, 0);
  let html = `<h3 style="margin:6px 0 10px">“${r.item.label.replace("  (curated need)", "")}” is available on ${totalTrims} trim${totalTrims !== 1 ? "s" : ""} across ${r.byModel.length} model${r.byModel.length !== 1 ? "s" : ""}</h3>`;
  for (const mm of r.byModel) {
    const cheapest = mm.hits[0];
    const variants = [...new Set(mm.hits.map(h => h.v.name))];
    const trimList = mm.hits.slice(0, 8).map(h => `${h.v.name} ${h.t.name}`).join(" · ");
    html += `<div class="finder-card">
      <div><div class="fm">${mm.model.name} <span style="color:var(--mut);font-weight:400;font-size:12px">${mm.model.subtitle}</span></div>
        <div class="ft">${mm.hits.length} trim${mm.hits.length !== 1 ? "s" : ""}: ${trimList}${mm.hits.length > 8 ? " …" : ""}</div></div>
      <div class="ff"><div class="from">from ${money(startPrice(cheapest.t))}</div>
        <div class="cnt">${cheapest.v.name} ${cheapest.t.name}</div></div>
    </div>`;
  }
  res.innerHTML = html;
}

/* ---------- render dispatch ---------- */
function renderAll() {
  if (state.mode === "match") { renderWants(); renderMatch(); }
  else if (state.mode === "browse") renderBrowse();
  else if (state.mode === "finder") renderFinder();
}

initControls();
renderAll();
})();
