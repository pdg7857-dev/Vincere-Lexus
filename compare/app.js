/* 2026 Luxury Cross-Reference — vanilla JS, reads window.DB (built by scripts/build_database.py) */
(function () {
"use strict";
const DB = window.DB || { meta: {}, brands: {}, trims: [] };
const DIMS = DB.meta.dimensions || ["reliability", "ownership", "value", "luxury", "efficiency", "performance"];
const DIM_LABEL = {
  reliability: "Reliability", ownership: "Low running cost", value: "Value",
  luxury: "Luxury / tech", efficiency: "Efficiency", performance: "Performance",
};
const BRAND_KEY = { "Lexus": "lexus", "BMW": "bmw", "Mercedes-Benz": "mb", "Audi": "audi" };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// ---- state ----
let weights = Object.assign({}, DB.meta.defaultWeights || {});
DIMS.forEach(d => { if (weights[d] == null) weights[d] = 15; });
const filters = { brands: new Set(), bodies: new Set(), pts: new Set(), maxPrice: 300000, minSeats: 0, search: "" };
let sortBy = "composite";
const compare = []; // array of trim refs

// give every trim a stable id
DB.trims.forEach((t, i) => { t._id = i; });

// ---- scoring ----
function composite(t) {
  let sum = 0, wsum = 0;
  for (const d of DIMS) {
    const w = weights[d] || 0;
    sum += (t.scores[d] || 0) * w;
    wsum += w;
  }
  return wsum ? sum / wsum : 0;
}
function scoreClass(v) { return v >= 67 ? "s-good" : v >= 45 ? "s-mid" : "s-bad"; }
function fmtPrice(p) { return p ? "$" + p.toLocaleString("en-CA") : "—"; }
function brandColor(b) { return (DB.brands[b] || {}).color || "#888"; }

// ---- build controls ----
function buildPresets() {
  const wrap = $("#presets");
  const presets = DB.meta.presets || {};
  Object.keys(presets).forEach(name => {
    const b = document.createElement("button");
    b.textContent = name;
    if (JSON.stringify(presets[name]) === JSON.stringify(DB.meta.defaultWeights)) b.classList.add("active");
    b.onclick = () => {
      weights = Object.assign({}, presets[name]);
      $$("#presets button").forEach(x => x.classList.toggle("active", x === b));
      syncSliders(); render();
    };
    wrap.appendChild(b);
  });
}
function buildSliders() {
  const wrap = $("#sliders");
  wrap.innerHTML = "";
  DIMS.forEach(d => {
    const row = document.createElement("div");
    row.className = "slider";
    row.innerHTML = `<div class="row"><span>${DIM_LABEL[d]}</span><b data-v="${d}">${weights[d]}</b></div>
      <input type="range" min="0" max="40" step="1" value="${weights[d]}" data-dim="${d}">`;
    wrap.appendChild(row);
  });
  wrap.oninput = e => {
    const d = e.target.dataset.dim; if (!d) return;
    weights[d] = +e.target.value;
    $(`b[data-v="${d}"]`).textContent = weights[d];
    $$("#presets button").forEach(x => x.classList.remove("active"));
    render();
  };
}
function syncSliders() {
  DIMS.forEach(d => {
    const i = $(`input[data-dim="${d}"]`); if (i) i.value = weights[d];
    const b = $(`b[data-v="${d}"]`); if (b) b.textContent = weights[d];
  });
}

function buildChipFilter(elId, values, set, key) {
  const el = $(elId);
  values.forEach(v => {
    const b = document.createElement("button");
    b.textContent = v; b.dataset.v = v;
    b.onclick = () => { set.has(v) ? set.delete(v) : set.add(v); b.classList.toggle("on"); render(); };
    el.appendChild(b);
  });
}

function buildBrandStrip() {
  const strip = $("#brandStrip");
  ["Lexus", "BMW", "Mercedes-Benz", "Audi"].forEach(b => {
    const info = DB.brands[b]; if (!info) return;
    const n = DB.trims.filter(t => t.brand === b).length;
    const card = document.createElement("div");
    card.className = "bcard";
    card.style.setProperty("--bc", info.color);
    card.innerHTML = `<h4>${b}</h4>
      <div class="nums">
        <div class="num">Reliability<b>${info.reliability100}</b></div>
        <div class="num">Low cost<b>${info.ownership100}</b></div>
        <div class="num">Trims<b>${n}</b></div>
      </div>
      <div class="note">${info.reliabilityNote || ""}</div>
      <div class="note"><b>Service:</b> ${info.maintenance.plan} · ~$${info.maintenance.est5yrCad.toLocaleString("en-CA")}/5yr</div>`;
    strip.appendChild(card);
  });
}

// ---- filtering + render ----
function passes(t) {
  if (filters.brands.size && !filters.brands.has(t.brand)) return false;
  if (filters.bodies.size && !filters.bodies.has(t.bodyStyle)) return false;
  if (filters.pts.size && !filters.pts.has(t.ptType)) return false;
  if (t.priceCad && t.priceCad > filters.maxPrice) return false;
  if (filters.minSeats && (t.seats || 0) < filters.minSeats) return false;
  if (filters.search) {
    const s = filters.search.toLowerCase();
    if (!((t.model || "") + " " + (t.trim || "") + " " + t.brand).toLowerCase().includes(s)) return false;
  }
  return true;
}

function trimCard(t, rank) {
  const comp = composite(t);
  const el = document.createElement("div");
  el.className = "card";
  el.style.setProperty("--bc", brandColor(t.brand));
  const bars = DIMS.map(d => {
    const v = Math.round(t.scores[d] || 0);
    return `<div class="bar"><span>${DIM_LABEL[d]}</span>
      <div class="track"><div class="fill ${scoreClass(v)}" style="width:${v}%"></div></div>
      <span class="v">${v}</span></div>`;
  }).join("");
  const specs = [];
  if (t.hp) specs.push(`<b>${t.hp}</b> hp`);
  if (t.drivetrain) specs.push(`<b>${t.drivetrain}</b>`);
  if (t.zero100) specs.push(`<b>${t.zero100}</b>s 0-100`);
  if (t.ptType === "ev" && t.evRangeKm) specs.push(`<b>${t.evRangeKm}</b> km range`);
  else if (t.fuelL100) specs.push(`<b>${t.fuelL100}</b> L/100km`);
  if (t.seats) specs.push(`<b>${t.seats}</b> seats`);
  specs.push(`<b>${t.ptType}</b>`);
  const pros = (t.pros || []).slice(0, 3).map(p => `<span class="tag-pro">+ ${p}</span>`).join("");
  const cons = (t.cons || []).slice(0, 3).map(c => `<span class="tag-con">− ${c}</span>`).join("");
  const inCmp = compare.includes(t);
  el.innerHTML = `
    <div class="head">
      <div>
        <div class="rank">#${rank} · ${t.brand}</div>
        <div class="name">${t.model} <span class="sub">${t.trim || ""}</span></div>
        <div class="sub">${t.segment || t.bodyStyle}</div>
      </div>
      <div class="composite"><div class="big">${Math.round(comp)}</div><div class="lbl">match</div></div>
    </div>
    <div class="price">${fmtPrice(t.priceCad)} <small>CAD${t.confidence && t.confidence !== "high" ? " · est." : ""}</small></div>
    <div class="specrow">${specs.join(" · ")}</div>
    <div class="bars">${bars}</div>
    <div class="tags">${pros}${cons}</div>
    <div class="actions">
      <button class="ghost cmpbtn">${inCmp ? "✓ in compare" : "+ Compare"}</button>
      <button class="ghost detbtn">Details</button>
    </div>`;
  el.querySelector(".cmpbtn").onclick = () => toggleCompare(t);
  el.querySelector(".detbtn").onclick = () => showDetail(t);
  return el;
}

function render() {
  let list = DB.trims.filter(passes);
  list.forEach(t => t._comp = composite(t));
  const cmp = {
    composite: (a, b) => b._comp - a._comp,
    reliability: (a, b) => b.scores.reliability - a.scores.reliability,
    ownership: (a, b) => b.scores.ownership - a.scores.ownership,
    performance: (a, b) => b.scores.performance - a.scores.performance,
    value: (a, b) => b.scores.value - a.scores.value,
    efficiency: (a, b) => b.scores.efficiency - a.scores.efficiency,
    priceCad: (a, b) => (a.priceCad || 9e9) - (b.priceCad || 9e9),
    priceDesc: (a, b) => (b.priceCad || 0) - (a.priceCad || 0),
  }[sortBy] || ((a, b) => b._comp - a._comp);
  list.sort(cmp);

  const cards = $("#cards");
  cards.innerHTML = "";
  list.slice(0, 400).forEach((t, i) => cards.appendChild(trimCard(t, i + 1)));
  $("#resCount").textContent = list.length + " trims";
  if (!list.length) cards.innerHTML = `<p style="color:var(--muted)">No trims match these filters.</p>`;
}

// ---- compare ----
function toggleCompare(t) {
  const i = compare.indexOf(t);
  if (i >= 0) compare.splice(i, 1);
  else { if (compare.length >= 4) { alert("Compare up to 4 at a time."); return; } compare.push(t); }
  renderCompareBar(); render();
}
function renderCompareBar() {
  const bar = $("#comparebar");
  bar.classList.toggle("hidden", compare.length === 0);
  $("#cmpLabel").textContent = `Compare (${compare.length})`;
  const chips = $("#cmpChips"); chips.innerHTML = "";
  compare.forEach(t => {
    const c = document.createElement("span");
    c.className = "c";
    c.innerHTML = `${t.brand} ${t.model} ${t.trim || ""} <button>×</button>`;
    c.querySelector("button").onclick = () => toggleCompare(t);
    chips.appendChild(c);
  });
}
function openCompare() {
  if (compare.length < 2) { alert("Pick at least 2 trims to compare."); return; }
  const rows = [];
  const spec = (label, fn) => {
    const vals = compare.map(fn);
    rows.push(`<tr><td class="metric">${label}</td>${vals.map(v => `<td>${v}</td>`).join("")}</tr>`);
  };
  spec("Price (CAD)", t => fmtPrice(t.priceCad));
  spec("Powertrain", t => t.ptType + (t.engine ? `<br><small>${t.engine}</small>` : ""));
  spec("Power", t => t.hp ? t.hp + " hp" : "—");
  spec("Drivetrain", t => t.drivetrain || "—");
  spec("0-100 km/h", t => t.zero100 ? t.zero100 + " s" : "—");
  spec("Efficiency", t => t.ptType === "ev" ? (t.evRangeKm ? t.evRangeKm + " km range" : "—") : (t.fuelL100 ? t.fuelL100 + " L/100km" : "—"));
  spec("Seats", t => t.seats || "—");
  // score rows with best highlight + bars
  DIMS.forEach(d => {
    const vals = compare.map(t => Math.round(t.scores[d] || 0));
    const best = Math.max(...vals);
    rows.push(`<tr><td class="metric">${DIM_LABEL[d]}</td>${vals.map(v =>
      `<td class="${v === best ? "best" : ""}">${v}<div class="minibar"><i class="fill ${scoreClass(v)}" style="width:${v}%;background:${v >= 67 ? "var(--good)" : v >= 45 ? "var(--mid)" : "var(--bad)"}"></i></div></td>`).join("")}</tr>`);
  });
  const comps = compare.map(t => Math.round(composite(t)));
  const bestC = Math.max(...comps);
  rows.push(`<tr><td class="metric"><b>Overall (your weights)</b></td>${comps.map(v => `<td class="${v === bestC ? "best" : ""}"><b>${v}</b></td>`).join("")}</tr>`);
  // pros/cons
  rows.push(`<tr><td class="metric">Pros</td>${compare.map(t => `<td>${(t.pros || []).map(p => "• " + p).join("<br>")}</td>`).join("")}</tr>`);
  rows.push(`<tr><td class="metric">Cons</td>${compare.map(t => `<td>${(t.cons || []).map(c => "• " + c).join("<br>")}</td>`).join("")}</tr>`);

  const head = compare.map(t => `<th style="border-top:3px solid ${brandColor(t.brand)}">${t.brand}<br>${t.model}<br><small>${t.trim || ""}</small></th>`).join("");
  $("#modalInner").innerHTML = `
    <button class="ghost closebtn" id="closeModal">Close ✕</button>
    <h2>Side-by-side</h2>
    <p style="color:var(--muted);font-size:.85rem">Green = best of the selected trims for that metric. Overall reflects your current priority weights.</p>
    <div style="overflow:auto"><table class="cmptable"><thead><tr><th>Metric</th>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  $("#modal").classList.remove("hidden");
  $("#closeModal").onclick = () => $("#modal").classList.add("hidden");
}

function showDetail(t) {
  const info = DB.brands[t.brand] || {};
  const w = info.warranty || {}, m = info.maintenance || {};
  const dimRows = DIMS.map(d => `<tr><td class="metric">${DIM_LABEL[d]}</td><td>${Math.round(t.scores[d])}<div class="minibar"><i style="width:${t.scores[d]}%;background:${t.scores[d] >= 67 ? "var(--good)" : t.scores[d] >= 45 ? "var(--mid)" : "var(--bad)"}"></i></div></td></tr>`).join("");
  $("#modalInner").innerHTML = `
    <button class="ghost closebtn" id="closeModal">Close ✕</button>
    <h2 style="border-bottom:3px solid ${brandColor(t.brand)};display:inline-block;padding-bottom:.2rem">${t.brand} ${t.model}</h2>
    <div class="sub" style="color:var(--muted);margin:.3rem 0 .8rem">${t.trim || ""} · ${t.segment || t.bodyStyle} · 2026</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">
      <div>
        <h3>Key specs</h3>
        <table class="cmptable"><tbody>
          <tr><td class="metric">Price</td><td>${fmtPrice(t.priceCad)} CAD${t.confidence && t.confidence !== "high" ? " (est.)" : ""}</td></tr>
          <tr><td class="metric">Powertrain</td><td>${t.ptType}${t.engine ? " · " + t.engine : ""}</td></tr>
          <tr><td class="metric">Power</td><td>${t.hp ? t.hp + " hp" : "—"}${t.torque ? " / " + t.torque + " lb-ft" : ""}</td></tr>
          <tr><td class="metric">Drivetrain</td><td>${t.drivetrain || "—"}${t.transmission ? " · " + t.transmission : ""}</td></tr>
          <tr><td class="metric">0-100 km/h</td><td>${t.zero100 ? t.zero100 + " s" : "—"}</td></tr>
          <tr><td class="metric">${t.ptType === "ev" ? "Range" : "Fuel"}</td><td>${t.ptType === "ev" ? (t.evRangeKm ? t.evRangeKm + " km" : "—") : (t.fuelL100 ? t.fuelL100 + " L/100km" : "—")}${t.batteryKwh ? " · " + t.batteryKwh + " kWh" : ""}</td></tr>
          <tr><td class="metric">Seats</td><td>${t.seats || "—"}</td></tr>
        </tbody></table>
        <h3 style="margin-top:1rem">Scores</h3>
        <table class="cmptable"><tbody>${dimRows}
          <tr><td class="metric"><b>Overall</b></td><td><b>${Math.round(composite(t))}</b></td></tr></tbody></table>
      </div>
      <div>
        <h3>Pros</h3>${(t.pros || []).map(p => `<div class="tag-pro" style="display:block;margin:.2rem 0">+ ${p}</div>`).join("") || "—"}
        <h3 style="margin-top:.8rem">Cons</h3>${(t.cons || []).map(c => `<div class="tag-con" style="display:block;margin:.2rem 0">− ${c}</div>`).join("") || "—"}
        ${(t.notable && t.notable.length) ? `<h3 style="margin-top:.8rem">Notable features</h3><div style="font-size:.82rem;color:#444">${t.notable.join(" · ")}</div>` : ""}
        <h3 style="margin-top:.8rem">${t.brand} ownership</h3>
        <div style="font-size:.82rem;color:#444">
          <div><b>Reliability:</b> ${info.reliabilityNote || ""}</div>
          <div style="margin-top:.3rem"><b>Warranty:</b> ${w.comprehensive || "?"} comprehensive · ${w.powertrain || "?"} powertrain${w.ev_battery ? " · " + w.ev_battery + " EV battery" : ""}</div>
          <div style="margin-top:.3rem"><b>Maintenance:</b> ${m.plan || ""} — ~$${(m.est5yrCad || 0).toLocaleString("en-CA")} over 5 yrs (~$${(m.estAnnualCad || 0).toLocaleString("en-CA")}/yr). ${m.note || ""}</div>
        </div>
      </div>
    </div>`;
  $("#modal").classList.remove("hidden");
  $("#closeModal").onclick = () => $("#modal").classList.add("hidden");
}

function showAbout() {
  $("#modalInner").innerHTML = `
    <button class="ghost closebtn" id="closeModal">Close ✕</button>
    <h2>How the scoring works</h2>
    <p style="font-size:.9rem;line-height:1.6">Every trim is scored 0–100 on six dimensions. Your <b>priority weights</b> (left panel)
    combine them into the <b>overall match</b> used to rank cars. The default <b>Reliability-first</b> profile leans on
    reliability and running cost — which favours Lexus by design.</p>
    <ul style="font-size:.88rem;line-height:1.6">
      <li><b>Reliability</b> — brand dependability. From J.D. Power 2025 VDS (PP100, lower is better): Lexus 140 · BMW 189 · Mercedes 243 · Audi 273; cross-checked with Consumer Reports 2025-26.</li>
      <li><b>Low running cost</b> — maintenance + repair + warranty/free-service value. Lexus ~$551/yr typical repair vs ~$900–990 for the German three; Mercedes costliest long-term.</li>
      <li><b>Value</b> — price vs the average of its body-style peers in this database.</li>
      <li><b>Luxury / tech</b> — equipment & price tier proxy.</li>
      <li><b>Efficiency</b> — combined L/100km (ICE/hybrid) or electric range (EV).</li>
      <li><b>Performance</b> — power and 0-100 km/h.</li>
    </ul>
    <p style="font-size:.82rem;color:var(--muted)">Market: Canada (CAD MSRP). Prices/specs gathered ${DB.meta.generated} from brand sites and reputable outlets; some German-brand figures are estimates (flagged "est."). Always confirm with a dealer before purchase.</p>`;
  $("#modal").classList.remove("hidden");
  $("#closeModal").onclick = () => $("#modal").classList.add("hidden");
}

// ---- init ----
function init() {
  $("#trimCount").textContent = DB.trims.length;
  buildBrandStrip();
  buildPresets();
  buildSliders();
  const bodies = [...new Set(DB.trims.map(t => t.bodyStyle))].filter(Boolean).sort();
  const pts = [...new Set(DB.trims.map(t => t.ptType))].filter(Boolean).sort();
  buildChipFilter("#fBrand", ["Lexus", "BMW", "Mercedes-Benz", "Audi"], filters.brands);
  buildChipFilter("#fBody", bodies, filters.bodies);
  buildChipFilter("#fPt", pts, filters.pts);
  $("#fPrice").oninput = e => { filters.maxPrice = +e.target.value; $("#priceLabel").textContent = +e.target.value >= 300000 ? "any" : "$" + (+e.target.value).toLocaleString("en-CA"); render(); };
  $("#fSeats").onchange = e => { filters.minSeats = +e.target.value; render(); };
  $("#fSearch").oninput = e => { filters.search = e.target.value; render(); };
  $("#sortBy").onchange = e => { sortBy = e.target.value; render(); };
  $("#clearFilters").onclick = () => {
    filters.brands.clear(); filters.bodies.clear(); filters.pts.clear();
    filters.maxPrice = 300000; filters.minSeats = 0; filters.search = "";
    $$(".chips button").forEach(b => b.classList.remove("on"));
    $("#fPrice").value = 300000; $("#priceLabel").textContent = "any";
    $("#fSeats").value = 0; $("#fSearch").value = "";
    render();
  };
  $("#resetWeights").onclick = () => { weights = Object.assign({}, DB.meta.defaultWeights); syncSliders(); $$("#presets button").forEach((x, i) => x.classList.toggle("active", i === 0)); render(); };
  $("#openCompare").onclick = openCompare;
  $("#clearCompare").onclick = () => { compare.length = 0; renderCompareBar(); render(); };
  $("#aboutBtn").onclick = showAbout;
  $("#modal").onclick = e => { if (e.target.id === "modal") $("#modal").classList.add("hidden"); };
  render();
}
init();
})();
