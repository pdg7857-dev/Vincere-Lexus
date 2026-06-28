/* Vincere — local single-user Lexus CRM. Plain JS, no dependencies, works offline (file://). */
(function () {
'use strict';

/* ---------- bundled 2026 pricing (lexus.ca Build & Price, ON incl. freight/PDI, captured 2026-06-16) ---------- */
const PRICING = [{"year":"2026","series":"GX","model":"GX 550","suffix":"Signature","msrp":90787,"leasePayment":1385,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"GX","model":"GX 550","suffix":"Premium","msrp":99525,"leasePayment":1532,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"GX","model":"GX 550","suffix":"Overtrail","msrp":100644,"leasePayment":1568,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"GX","model":"GX 550","suffix":"Luxury","msrp":112084,"leasePayment":1759,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"GX","model":"GX 550","suffix":"Overtrail+","msrp":115974,"leasePayment":1844,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"GX","model":"GX 550","suffix":"Executive","msrp":116620,"leasePayment":1854,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"LX","model":"LX 600","suffix":"Premium","msrp":133236,"leasePayment":2134,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"LX","model":"LX 600","suffix":"F SPORT","msrp":152070,"leasePayment":2502,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"LX","model":"LX 600","suffix":"Luxury","msrp":157536,"leasePayment":2596,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"LX","model":"LX 700h","suffix":"Overtrail+ (2ROW)","msrp":150326,"leasePayment":2447,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"LX","model":"LX 700h","suffix":"Overtrail+ (3 ROW)","msrp":152840,"leasePayment":2465,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"LX","model":"LX 700h","suffix":"Luxury","msrp":164298,"leasePayment":2685,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"LX","model":"LX 700h","suffix":"Executive VIP","msrp":192402,"leasePayment":3256,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350","suffix":"Premium","msrp":58477,"leasePayment":816,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"NX","model":"NX 350","suffix":"Luxury","msrp":62616,"leasePayment":883,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350","suffix":"F SPORT 2","msrp":65659,"leasePayment":924,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350","suffix":"Ultra Luxury","msrp":66584,"leasePayment":949,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350","suffix":"Executive","msrp":71850,"leasePayment":1022,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350","suffix":"F SPORT 3","msrp":72050,"leasePayment":1024,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350h","suffix":"Premium","msrp":61422,"leasePayment":904,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"NX","model":"NX 350h","suffix":"Luxury","msrp":65562,"leasePayment":975,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350h","suffix":"F SPORT 2","msrp":68939,"leasePayment":1023,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350h","suffix":"Ultra Luxury","msrp":69529,"leasePayment":1044,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350h","suffix":"Executive","msrp":74275,"leasePayment":1113,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 350h","suffix":"F SPORT 3","msrp":75130,"leasePayment":1126,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 450h+","suffix":"Ultra Premium","msrp":63387,"leasePayment":932,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"NX","model":"NX 450h+","suffix":"Luxury","msrp":73387,"leasePayment":1114,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 450h+","suffix":"F SPORT 2","msrp":76487,"leasePayment":1159,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 450h+","suffix":"Executive","msrp":80002,"leasePayment":1211,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"NX","model":"NX 450h+","suffix":"F SPORT 3","msrp":80122,"leasePayment":1227,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350","suffix":"Premium","msrp":64282,"leasePayment":870,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"RX","model":"RX 350","suffix":"Luxury","msrp":71696,"leasePayment":993,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350","suffix":"F SPORT 2","msrp":74196,"leasePayment":1027,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350","suffix":"Ultra Luxury","msrp":75201,"leasePayment":1054,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350","suffix":"Executive","msrp":79701,"leasePayment":1130,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350","suffix":"F SPORT 3","msrp":79701,"leasePayment":1130,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350","suffix":"F SPORT Black Line","msrp":82561,"leasePayment":1154,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350h","suffix":"Premium","msrp":67042,"leasePayment":961,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"RX","model":"RX 350h","suffix":"F SPORT Design","msrp":69557,"leasePayment":1008,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350h","suffix":"Luxury","msrp":74456,"leasePayment":1090,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350h","suffix":"Ultra Luxury","msrp":77961,"leasePayment":1153,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 350h","suffix":"Executive","msrp":82461,"leasePayment":1233,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 500h","suffix":"F SPORT Performance 2","msrp":86611,"leasePayment":1309,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"RX","model":"RX 500h","suffix":"F SPORT Performance 3","msrp":92411,"leasePayment":1411,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 500h","suffix":"F SPORT Black Line","msrp":93201,"leasePayment":1440,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RX","model":"RX 450h+","suffix":"Ultra Premium","msrp":81892,"leasePayment":1206,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"RX","model":"RX 450h+","suffix":"Executive","msrp":90782,"leasePayment":1334,"leaseRate":3.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RZ","model":"RZ 350e","suffix":"Signature","msrp":63380,"leasePayment":953,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"RZ","model":"RZ 450e AWD","suffix":"Signature","msrp":70380,"leasePayment":1060,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"RZ","model":"RZ 450e AWD","suffix":"Luxury","msrp":76381,"leasePayment":1178,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RZ","model":"RZ 450e AWD","suffix":"Executive","msrp":86350,"leasePayment":1349,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"RZ","model":"RZ 550e AWD","suffix":"F SPORT","msrp":81380,"leasePayment":1271,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"TX","model":"TX 350","suffix":"Luxury","msrp":73252,"leasePayment":1046,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"TX","model":"TX 350","suffix":"Ultra Luxury","msrp":76005,"leasePayment":1084,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"TX","model":"TX 350","suffix":"Executive 7-Pass","msrp":84258,"leasePayment":1229,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"TX","model":"TX 350","suffix":"F SPORT 3","msrp":84881,"leasePayment":1237,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"TX","model":"TX 350","suffix":"Executive 6-Pass","msrp":85008,"leasePayment":1239,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"TX","model":"TX 350","suffix":"F SPORT 3 + Towing Hitch","msrp":86028,"leasePayment":1254,"leaseRate":4.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"TX","model":"TX 500h","suffix":"F SPORT Performance 2","msrp":88797,"leasePayment":1390,"leaseRate":6.7,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"TX","model":"TX 500h","suffix":"F SPORT Performance 2 + Towing Hitch","msrp":89943,"leasePayment":1408,"leaseRate":6.7,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"TX","model":"TX 500h","suffix":"F SPORT Performance 3","msrp":94796,"leasePayment":1499,"leaseRate":6.7,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"TX","model":"TX 500h","suffix":"F SPORT Performance 3 + Towing Hitch","msrp":95943,"leasePayment":1517,"leaseRate":6.7,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"UX","model":"UX 300h","suffix":"Premium","msrp":48442,"leasePayment":703,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"UX","model":"UX 300h","suffix":"F SPORT  Design","msrp":49512,"leasePayment":726,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"UX","model":"UX 300h","suffix":"Luxury","msrp":53906,"leasePayment":797,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"UX","model":"UX 300h","suffix":"FSPORT 2","msrp":56181,"leasePayment":849,"leaseRate":5.5,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"ES","model":"ES 350h AWD","suffix":"Signature","msrp":63297,"leasePayment":980,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"ES","model":"ES 350h AWD","suffix":"Premium","msrp":65987,"leasePayment":1020,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"ES","model":"ES 350h AWD","suffix":"Premium+","msrp":69957,"leasePayment":1092,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"ES","model":"ES 350e FWD","suffix":"Signature","msrp":65915,"leasePayment":1042,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"ES","model":"ES 350e FWD","suffix":"Premium","msrp":67380,"leasePayment":1064,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"ES","model":"ES 350e FWD","suffix":"Luxury","msrp":74955,"leasePayment":1207,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"ES","model":"ES 350e FWD","suffix":"Luxury+","msrp":77330,"leasePayment":1259,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"ES","model":"ES 350e FWD","suffix":"Executive VIP","msrp":81360,"leasePayment":1337,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"ES","model":"ES 500e AWD","suffix":"Signature","msrp":68915,"leasePayment":1076,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"ES","model":"ES 500e AWD","suffix":"Premium","msrp":70380,"leasePayment":1098,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"ES","model":"ES 500e AWD","suffix":"Luxury","msrp":77955,"leasePayment":1241,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"ES","model":"ES 500e AWD","suffix":"Luxury+","msrp":80525,"leasePayment":1295,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"IS","model":"IS 350 AWD","suffix":"F SPORT DESIGN","msrp":60252,"leasePayment":905,"leaseRate":6.8,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"IS","model":"IS 350 AWD","suffix":"F SPORT 2","msrp":62345,"leasePayment":998,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"IS","model":"IS 350 AWD","suffix":"F SPORT 3","msrp":67445,"leasePayment":1101,"leaseRate":5.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"IS","model":"IS 350 AWD","suffix":"SPECIAL APPEARANCE PACKAGE","msrp":72964,"leasePayment":1127,"leaseRate":6.8,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"LS","model":"LS 500 AWD","suffix":"Heritage Edition","msrp":136236,"leasePayment":2322,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"LC","model":"LC 500","suffix":"Standard Package","msrp":125892,"leasePayment":2053,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":true},{"year":"2026","series":"LC","model":"LC 500","suffix":"Performance Package","msrp":141258,"leasePayment":2364,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":false},{"year":"2026","series":"LC","model":"LC Convertible","suffix":"Standard Package","msrp":146136,"leasePayment":2449,"leaseRate":6.9,"leaseTerm":48,"leaseKm":16000,"base":true}];

/* ---------- storage (optionally passcode-encrypted at rest) ---------- */
const KEY = 'vincere_crm_v1';
let DB = null, CKEY = null, CSALT = null, _persisting = false, _dirty = false;
function cryptoOK() { return !!(window.crypto && window.crypto.subtle); }
function _b64(buf) { var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
function _ub64(str) { var bin = atob(str), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
async function _deriveKey(pass, salt) { var km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
async function _encEnvelope() { var iv = crypto.getRandomValues(new Uint8Array(12)); var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, CKEY, new TextEncoder().encode(JSON.stringify(DB))); return JSON.stringify({ enc: 1, salt: _b64(CSALT), iv: _b64(iv), ct: _b64(ct) }); }
async function _decEnvelope(key, env) { var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: _ub64(env.iv) }, key, _ub64(env.ct)); return JSON.parse(new TextDecoder().decode(pt)); }
function save() { schedulePersist(); }
function schedulePersist() { if (_persisting) { _dirty = true; return; } _persisting = true; persist().then(function () { _persisting = false; if (_dirty) { _dirty = false; schedulePersist(); } }); }
async function persist() { try { if (CKEY) localStorage.setItem(KEY, await _encEnvelope()); else localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('⚠ Could not save (storage blocked).'); } }
async function loadDB() {
  var raw = localStorage.getItem(KEY);
  if (!raw) { seed(); return; }
  var env = null; try { env = JSON.parse(raw); } catch (e) {}
  if (env && env.enc) {
    if (!cryptoOK()) { alert('This data is passcode-encrypted, but this browser blocks encryption on file://. Open via the local-server method in the README.'); DB = { clients: [], activities: [], vehicles: [], pricing: PRICING.map(function (p) { return Object.assign({}, p); }), tasks: [], config: defaultConfig(), meta: {} }; return; }
    while (true) {
      var pass = prompt('🔒 Enter your CRM passcode:');
      if (pass == null) { if (confirm('Without the passcode the CRM cannot open. Try again?')) continue; DB = { clients: [], activities: [], vehicles: [], pricing: [], tasks: [], config: defaultConfig(), meta: {} }; return; }
      try { var salt = _ub64(env.salt); var k = await _deriveKey(pass, salt); var d = await _decEnvelope(k, env); DB = d; CKEY = k; CSALT = salt; ensureData(); return; }
      catch (e) { alert('Wrong passcode — try again.'); }
    }
  } else { try { DB = JSON.parse(raw); } catch (e) { DB = null; } if (!DB || !DB.clients) seed(); else ensureData(); }
}
async function setPasscode() { if (!cryptoOK()) { toast('Encryption needs a secure context — use the local-server method.'); return; } var p = prompt('Set a passcode. Youll need it every time you open the CRM. There is NO recovery — keep a backup.'); if (!p) return; var p2 = prompt('Re-enter passcode:'); if (p !== p2) { toast('Passcodes did not match'); return; } CSALT = crypto.getRandomValues(new Uint8Array(16)); CKEY = await _deriveKey(p, CSALT); await persist(); toast('🔒 Passcode set — data encrypted'); route(); }
async function removePasscode() { if (!CKEY) { toast('No passcode set'); return; } if (!confirm('Remove passcode and store data unencrypted on this device?')) return; CKEY = null; CSALT = null; await persist(); toast('Passcode removed'); route(); }

/* ---------- utils ---------- */
const uid = (p) => (p || 'id') + '_' + Math.random().toString(36).slice(2, 9);
const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function money(n) { if (n === '' || n == null || isNaN(n)) return ''; return '$' + Number(n).toLocaleString('en-CA'); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(ts) { if (!ts) return ''; const d = new Date(ts); return isNaN(d) ? '' : d.toISOString().slice(0, 10); }
function fmtWhen(ts) { const d = new Date(ts); return isNaN(d) ? '' : d.toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function daysSince(ts) { if (!ts) return Infinity; return Math.floor((Date.now() - ts) / 86400000); }
function num(v) { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; }
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length && r.some(x => x !== ''));
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600); }
function download(name, text, type) {
  const b = new Blob([text], { type: type || 'application/json' }); const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
}

/* ---------- config ---------- */
function ensureData() { if (!DB.config) DB.config = defaultConfig(); if (!DB.pricing || !DB.pricing.length) DB.pricing = PRICING.map(function (p) { return Object.assign({}, p); }); }
function defaultConfig() {
  return {
    repostDays: 10, newMake: 'Lexus',
    usedUnavail: 'sold|pend|deposit|hold|wholesale|deliver|apprais|service',
    taxRate: 13, defaultApr: 6.99, defaultTerm: 60, defaultDown: 0, fees: 0,
    seriesRank: { UX: 1, IS: 2, NX: 3, ES: 4, RZ: 4, RC: 5, RX: 6, GX: 7, LC: 8, LS: 9, LX: 10 }
  };
}

/* ---------- seed ---------- */
function loadPricingFromCSV(text) {
  const rows = parseCSV(text); const out = [];
  for (let i = 1; i < rows.length; i++) { const r = rows[i]; if (!r[1]) continue; out.push({ year: r[0], series: r[1], model: r[2], suffix: r[3], msrp: num(r[4]), notes: r[5] || '' }); }
  return out;
}
function seed() {
  DB = { clients: [], activities: [], vehicles: [], pricing: [], tasks: [], config: defaultConfig(), meta: { createdAt: Date.now(), lastBackupAt: 0 } };
  DB.pricing = PRICING.map(function(p){return Object.assign({},p);});
  sampleData();
  save();
}
function sampleData() {
  const c1 = { id: uid('c'), name: 'Jane Prospect', phone: '555-0101', email: 'jane@example.com', status: 'Hot', budget: 70000, make: '', year: '', series: 'RX', model: '', color: 'Caviar', maxKm: '', ownYear: '', ownSeries: '', ownModel: '', notes: 'Referred by service dept. Wants a caviar RX, no rush but ready to buy.', lastContact: Date.now() - 2 * 86400000, createdAt: Date.now() };
  const c2 = { id: uid('c'), name: 'Marcus Webb', phone: '555-0102', email: 'marcus@example.com', status: 'Warm', budget: 60000, make: '', year: '', series: 'NX', model: '', color: '', maxKm: '', ownYear: '', ownSeries: '', ownModel: '', notes: 'Comparing NX vs competitors.', lastContact: Date.now() - 9 * 86400000, createdAt: Date.now() };
  const c3 = { id: uid('c'), name: 'Bob Shopper', phone: '555-0103', email: 'bob@example.com', status: 'Cold', budget: 35000, make: 'Toyota', year: 2022, model: 'RAV4', series: '', color: '', maxKm: 60000, ownYear: '', ownSeries: '', ownModel: '', notes: 'Budget used SUV shopper.', lastContact: Date.now() - 30 * 86400000, createdAt: Date.now() };
  const c4 = { id: uid('c'), name: 'Diane Clark', phone: '555-0104', email: 'diane@example.com', status: 'Customer', budget: 90000, make: '', year: '', series: '', model: '', color: '', maxKm: '', ownYear: 2021, ownSeries: 'ES', ownModel: 'ES 300h', notes: 'Existing customer since 2021. Lease up next spring — upgrade candidate.', lastContact: Date.now() - 5 * 86400000, createdAt: Date.now() };
  DB.clients = [c1, c2, c3, c4];
  DB.vehicles = [
    { id: uid('v'), kind: 'New', stage: 'Inventory', ref: 'ORD1001', vin: 'JTX1A0001', year: 2026, series: 'RX', make: 'Lexus', model: 'RX 350', suffix: 'Premium', color: 'Caviar', km: '', price: '', status: 'Available', etaFrom: '', etaTo: '', customer: '', comments: '' },
    { id: uid('v'), kind: 'New', stage: 'Pipeline', ref: 'ORD1002', vin: '', year: 2026, series: 'NX', make: 'Lexus', model: 'NX 350', suffix: 'Premium', color: 'Nori Green', km: '', price: '', status: 'Ordered', etaFrom: todayStr(), etaTo: fmtDate(Date.now() + 5 * 86400000), customer: '', comments: '' },
    { id: uid('v'), kind: 'New', stage: 'Delivery', ref: 'ORD1003', vin: 'JTX1A0003', year: 2026, series: 'ES', make: 'Lexus', model: 'ES 350h AWD', suffix: 'Premium', color: 'Sonic', km: '', price: '', status: 'Sold', etaFrom: todayStr(), etaTo: fmtDate(Date.now() + 2 * 86400000), customer: 'Diane Clark', comments: '' },
    { id: uid('v'), kind: 'Used', stage: '', ref: 'U500', vin: '', year: 2022, make: 'Toyota', series: '', model: 'RAV4', suffix: '', color: 'Blue / Black', km: 45000, price: 32000, status: 'Available', etaFrom: '', etaTo: '', customer: '', comments: 'Carfax clean / 1 owner', lastPostedAt: Date.now() - 12 * 86400000 },
    { id: uid('v'), kind: 'Used', stage: '', ref: 'U501', vin: '', year: 2023, make: 'Lexus', series: '', model: 'RX 350', suffix: '', color: 'Caviar / Black', km: 20000, price: 58000, status: 'Available', etaFrom: '', etaTo: '', customer: '', comments: 'Carfax clean / 2 owners', lastPostedAt: 0 }
  ];
  ['Contacted', 'New Lead', 'New Lead', 'Won'].forEach((s, i) => { DB.clients[i].stage = s; DB.clients[i].interested = []; });
  c1.interested = [DB.vehicles[0].id, DB.vehicles[4].id];
  DB.activities = [
    { id: uid('a'), clientId: c1.id, type: 'Call', body: 'Left voicemail about incoming Caviar RX 350.', at: Date.now() - 2 * 86400000 },
    { id: uid('a'), clientId: c1.id, type: 'Note', body: 'Prefers AWD, wants heated wheel. Trade-in possible (2019 RX).', at: Date.now() - 6 * 86400000 }
  ];
  DB.tasks = [
    { id: uid('t'), clientId: c1.id, title: 'Follow up with Jane on RX 350 availability', due: todayStr(), done: false, createdAt: Date.now() }
  ];
}

/* ---------- domain logic ---------- */
function client(id) { return DB.clients.find(c => c.id === id); }
function vehicle(id) { return DB.vehicles.find(v => v.id === id); }
function _nser(x){ var t=(norm(x).split(' ')[0]||''); return (t.length===3 && 'hep'.indexOf(t[2])>=0)? t.slice(0,2): t; }
function _core(x){ return norm(x).replace(/\b(awd|fwd|4wd|rwd)\b/g,'').replace(/[^a-z0-9]/g,''); }
function _nsuf(x){ return norm(x).replace(/\s*-\s*premium (paint|colour)/g,'').replace(/ package/g,'').trim(); }
function _tscore(a,b){ a=_nsuf(a); b=_nsuf(b); if(a===b) return 100; if(a&&b&&(a.indexOf(b)>=0||b.indexOf(a)>=0)) return 85; var ta=a.split(' '),tb=b.split(' '),set={},i=0,u={}; ta.forEach(function(x){set[x]=1;u[x]=1;}); tb.forEach(function(x){ if(set[x])i++; u[x]=1;}); var un=Object.keys(u).length; return un? Math.round(70*i/un):0; }
function pricingRow(year, series, model, suffix){
  var g=DB.pricing.filter(function(p){ return _nser(p.series)===_nser(series) && _core(p.model)===_core(model); });
  if(!g.length) g=DB.pricing.filter(function(p){ return _nser(p.series)===_nser(series) && (_core(p.model).indexOf(_core(model))>=0 || _core(model).indexOf(_core(p.model))>=0); });
  if(!g.length) return null;
  var best=g[0], bs=-1; g.forEach(function(p){ var sc=_tscore(suffix,p.suffix); if(sc>bs){ bs=sc; best=p; } });
  if(bs<40){ var base=g.filter(function(p){return p.base;}); return base[0]|| g.reduce(function(a,b){return (a.msrp||9e9)<(b.msrp||9e9)?a:b;}); }
  return best;
}
function pricingLookup(year, series, model, suffix){ var r=pricingRow(year,series,model,suffix); return r? r.msrp : null; }
function financeMonthly(principal, apr, term){ if(!principal||principal<=0||!term) return 0; var r=(apr||0)/100/12; return r? principal*r/(1-Math.pow(1+r,-term)) : principal/term; }
function buildQuote(v, c, o){
  o=o||{}; c=c||{};
  var price=(o.price!=null&&o.price!=='')? num(o.price) : (v.kind==='New'? pricingLookup(v.year,v.series,v.model,v.suffix) : num(v.price));
  if(price==null) return null;
  var cfg=DB.config;
  var pick=function(k,d){ return (o[k]!=null&&o[k]!=='')? num(o[k]) : (c[k]!=null&&c[k]!=='' ? num(c[k]) : d); };
  var trade=pick('trade', num(c.tradeValue)||0)||0, lien=pick('lien', num(c.lienOwing)||0)||0;
  var down=(o.down!=null&&o.down!=='')?num(o.down):(num(cfg.defaultDown)||0);
  var apr=(o.apr!=null&&o.apr!=='')?num(o.apr):(num(cfg.defaultApr)||0);
  var term=(o.term!=null&&o.term!=='')?num(o.term):(num(cfg.defaultTerm)||60);
  var taxRate=((o.taxRate!=null&&o.taxRate!=='')?num(o.taxRate):(num(cfg.taxRate)||0))/100;
  var fees=(o.fees!=null&&o.fees!=='')?num(o.fees):(num(cfg.fees)||0);
  var taxable=Math.max(price+fees-trade,0), tax=taxable*taxRate;
  var financed=Math.max(price+fees+tax-down-(trade-lien),0);
  var finMo=financeMonthly(financed,apr,term);
  var row=v.kind==='New'? pricingRow(v.year,v.series,v.model,v.suffix):null, leaseMo=null, lease=null;
  if(row && row.leasePayment){ var cap=down+Math.max(trade-lien,0), mf=(row.leaseRate||0)/2400; leaseMo=Math.max(row.leasePayment-cap*(1/(row.leaseTerm||48)+mf),0); lease={term:row.leaseTerm,km:row.leaseKm,rate:row.leaseRate,base:row.leasePayment}; }
  return {price:price,trade:trade,lien:lien,down:down,apr:apr,term:term,taxRate:taxRate*100,fees:fees,taxable:taxable,tax:tax,financed:financed,finMo:finMo,leaseMo:leaseMo,lease:lease};
}
function mo(n){ return (n==null)?'—':'$'+Math.round(n).toLocaleString('en-CA')+'/mo'; }
function usedAvailable(v) { let re; try { re = new RegExp(DB.config.usedUnavail, 'i'); } catch (e) { re = /sold|pend/i; } return !re.test(String(v.status || '')); }
function budgetFit(price, budget) {
  if (budget === '' || budget == null || isNaN(budget)) return { t: 'No budget set', cls: '' };
  if (price == null || price === '' || isNaN(price)) return { t: 'No price', cls: '' };
  if (Number(price) <= Number(budget)) return { t: 'In budget', cls: 'fit-in' };
  return { t: 'Over by ' + money(Number(price) - Number(budget)), cls: 'fit-over' };
}
const wild = (cv, vv) => cv === '' || cv == null || norm(cv) === norm(vv);
const has = (cv, vv) => cv === '' || cv == null || norm(vv).includes(norm(cv));
function matchesForClient(c) {
  const out = [];
  DB.vehicles.forEach(v => {
    if (v.kind === 'New') {
      if (!(wild(c.year, v.year) && wild(c.series, v.series) && has(c.model, v.model) && has(c.color, v.color))) return;
      const price = pricingLookup(v.year, v.series, v.model, v.suffix);
      out.push({ v, type: 'New', price, fit: budgetFit(price, c.budget) });
    } else {
      if (!usedAvailable(v)) return;
      if (!(wild(c.make, v.make) && wild(c.year, v.year) && has(c.model, v.model) && has(c.color, v.color))) return;
      if (c.maxKm && num(v.km) != null && num(v.km) > Number(c.maxKm)) return;
      out.push({ v, type: 'Used', price: num(v.price), fit: budgetFit(num(v.price), c.budget) });
    }
  });
  return out;
}
function seriesRank(s) { return DB.config.seriesRank[String(s || '').toUpperCase()] || 0; }
function upsellForClient(c) {
  if (!c.ownYear && !c.ownSeries) return [];
  const cy = Number(c.ownYear) || 0, cr = seriesRank(c.ownSeries), out = [];
  DB.vehicles.forEach(v => {
    if (v.kind === 'Used' && !usedAvailable(v)) return;
    if (norm(v.customer) === norm(c.name)) return;
    const vy = Number(v.year) || 0, vr = v.kind === 'New' ? seriesRank(v.series) : 0;
    if (vy > cy || vr > cr) {
      const price = v.kind === 'New' ? pricingLookup(v.year, v.series, v.model, v.suffix) : num(v.price);
      out.push({ v, type: v.kind, price });
    }
  });
  return out;
}
function repostDue(v) {
  if (v.kind !== 'Used' || !usedAvailable(v)) return null;
  const due = v.lastPostedAt ? v.lastPostedAt + DB.config.repostDays * 86400000 : Date.now();
  return { due, never: !v.lastPostedAt, over: due <= Date.now() };
}
function openTasksDue() { return DB.tasks.filter(t => !t.done && (!t.due || Date.parse(t.due) <= Date.now() + 86400000)); }
function addActivity(clientId, type, body) {
  if (!body || !body.trim()) return;
  DB.activities.push({ id: uid('a'), clientId, type, body: body.trim(), at: Date.now() });
  const c = client(clientId); if (c) c.lastContact = Date.now();
  save();
}
function badge(status) {
  const m = { Hot: 'b-hot', Warm: 'b-warm', Cold: 'b-cold', Customer: 'b-cust' };
  return `<span class="badge2 ${m[status] || 'b-cold'}">${esc(status || '—')}</span>`;
}
function outlookLink(subject, dateStr) {
  return 'https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&allday=true&subject=' + encodeURIComponent(subject) + '&startdt=' + dateStr;
}

/* ---------- cross-reference helpers ---------- */
function interestedVehicles(c) { return (c.interested || []).map(vehicle).filter(Boolean); }
function interestedClients(vid) { return DB.clients.filter(c => (c.interested || []).indexOf(vid) >= 0); }
function toggleInterest(cid, vid) {
  const c = client(cid); if (!c) return; c.interested = c.interested || [];
  const i = c.interested.indexOf(vid);
  if (i >= 0) c.interested.splice(i, 1);
  else { c.interested.push(vid); const v = vehicle(vid); if (v) addActivity(cid, 'Note', 'Tagged interest: ' + vehLabel(v)); }
  save();
}
function stockByTrim() {
  const map = {};
  DB.vehicles.filter(v => v.kind === 'New').forEach(v => {
    const key = [v.series, v.model, v.suffix].filter(Boolean).join(' ') || '(unspecified)';
    if (!map[key]) map[key] = { trim: key, count: 0, Inventory: 0, Pipeline: 0, Delivery: 0 };
    map[key].count++; if (map[key][v.stage] != null) map[key][v.stage]++;
  });
  return Object.values(map).sort((a, b) => b.count - a.count);
}
function followUps() {
  const today = Date.now();
  return DB.clients.filter(c => {
    const st = norm(c.stage); if (st === 'lost' || st === 'won') return false;
    const overdue = DB.tasks.some(t => t.clientId === c.id && !t.done && t.due && Date.parse(t.due) <= today);
    const ds = daysSince(c.lastContact);
    const stale = (norm(c.status) === 'hot' && ds >= 5) || (norm(c.status) === 'warm' && ds >= 10) || (norm(c.status) === 'customer' && ds >= 30);
    return overdue || stale;
  }).sort((a, b) => (a.lastContact || 0) - (b.lastContact || 0));
}
function pipelineCounts() { const m = {}; STAGES.forEach(s => m[s] = 0); DB.clients.forEach(c => { const s = c.stage || 'New Lead'; if (m[s] != null) m[s]++; }); return m; }

/* ---------- router ---------- */
const STAGES = ['New Lead', 'Contacted', 'Test Drive', 'Quoted', 'Negotiation', 'Won', 'Lost'];
const NAV = [
  { k: 'dashboard', ico: '▦', lbl: 'Dashboard' },
  { k: 'clients', ico: '☺', lbl: 'Clients' },
  { k: 'pipeline', ico: '⇉', lbl: 'Pipeline' },
  { k: 'inventory', ico: '▤', lbl: 'Inventory' },
  { k: 'matches', ico: '⇄', lbl: 'Matches' },
  { k: 'upsell', ico: '↑', lbl: 'Upsell' },
  { k: 'tasks', ico: '✓', lbl: 'Tasks' },
  { k: 'settings', ico: '⚙', lbl: 'Settings' }
];
function renderNav(active) {
  const due = openTasksDue().length + DB.vehicles.filter(v => { const r = repostDue(v); return r && r.over; }).length;
  $('#nav').innerHTML = NAV.map(n => {
    const b = n.k === 'tasks' && due ? `<span class="badge">${due}</span>` : '';
    return `<a href="#/${n.k}" class="${active === n.k ? 'active' : ''}"><span class="ico">${n.ico}</span><span class="lbl">${n.lbl}</span>${b}</a>`;
  }).join('');
}
function backupBanner() {
  const d = daysSince(DB.meta.lastBackupAt);
  if (d <= 7) return '';
  const when = DB.meta.lastBackupAt ? d + ' days ago' : 'never';
  return `<div class="backupbar">⏳ Last backup: <b>${when}</b>. <button class="btn sm" data-act="backup">Export backup now</button></div>`;
}
function route() {
  const h = (location.hash.slice(1) || '/dashboard').split('/').filter(Boolean);
  const view = h[0] || 'dashboard';
  renderNav(view === 'client' ? 'clients' : view);
  $('#modalRoot').innerHTML = '';
  const v = $('#view'); v.scrollTop = 0;
  let html = backupBanner();
  if (view === 'dashboard') html += viewDashboard();
  else if (view === 'clients') html += viewClients();
  else if (view === 'client') html += viewClient(h[1]);
  else if (view === 'pipeline') html += viewPipeline();
  else if (view === 'inventory') html += viewInventory();
  else if (view === 'matches') html += viewMatches();
  else if (view === 'upsell') html += viewUpsell();
  else if (view === 'tasks') html += viewTasks();
  else if (view === 'settings') html += viewSettings();
  else if (view === 'search') html += viewSearch(decodeURIComponent(h[1] || ''));
  else html += '<div class="empty">Not found</div>';
  v.innerHTML = html;
  bindView(view, h[1]);
}

/* ---------- views ---------- */
function kpi(n, l) { return `<div class="card kpi"><div class="n">${n}</div><div class="l">${l}</div></div>`; }
function countStatus(s) { return DB.clients.filter(c => norm(c.status) === norm(s)).length; }

function viewDashboard() {
  const nv = DB.vehicles.filter(v => v.kind === 'New');
  const newC = { Inventory: 0, Pipeline: 0, Delivery: 0 };
  nv.forEach(v => { if (newC[v.stage] != null) newC[v.stage]++; });
  const used = DB.vehicles.filter(v => v.kind === 'Used');
  const usedAvail = used.filter(usedAvailable).length;
  const fups = followUps();
  const trims = stockByTrim();
  const pc = pipelineCounts();
  const hotMatch = DB.clients.filter(c => norm(c.status) === 'hot').map(c => ({ c, ms: matchesForClient(c).filter(m => m.fit.cls === 'fit-in' || m.fit.t === 'No budget set') })).filter(x => x.ms.length);
  const reposts = DB.vehicles.map(v => ({ v, r: repostDue(v) })).filter(x => x.r && x.r.over);
  const tasks = openTasksDue();

  return `<h1>Dashboard</h1><p class="sub">${new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
  <div class="grid cards">
    ${kpi(DB.clients.length, 'Clients')}
    ${kpi('<span style="color:var(--hot)">' + countStatus('Hot') + '</span>', 'Hot')}
    ${kpi(countStatus('Warm'), 'Warm')}
    ${kpi(countStatus('Customer'), 'Customers')}
    ${kpi(nv.length, 'New in stock')}
    ${kpi(usedAvail + '/' + used.length, 'Used avail')}
    ${kpi('<span style="color:var(--accent)">' + fups.length + '</span>', 'Need follow-up')}
    ${kpi('<span style="color:var(--accent)">' + reposts.length + '</span>', 'Reposts due')}
  </div>
  <div class="panel" style="margin-top:16px"><div class="hd">Pipeline — clients by stage</div><div class="bd"><div class="row">
    ${STAGES.map(s => `<a href="#/pipeline" class="card" style="flex:1;min-width:84px;text-align:center"><div style="font-size:22px;font-weight:700">${pc[s]}</div><div style="font-size:11px;color:var(--muted)">${esc(s)}</div></a>`).join('')}
  </div></div></div>
  <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px">
    <div class="panel"><div class="hd">📞 Follow up with (${fups.length})</div><div class="bd">
      ${fups.length ? `<table><thead><tr><th>Client</th><th>Status</th><th>Last contact</th></tr></thead><tbody>${fups.map(c => `<tr class="clk" data-go="#/client/${c.id}"><td><b>${esc(c.name)}</b> <span class="pill">${esc(c.stage || 'New Lead')}</span></td><td>${badge(c.status)}</td><td style="color:var(--accent)">${c.lastContact ? daysSince(c.lastContact) + 'd ago' : 'never'}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">Everyone's been contacted recently. 👏</div>`}
    </div></div>
    <div class="panel"><div class="hd">🚗 New cars in stock — by trim</div><div class="bd">
      ${trims.length ? `<table><thead><tr><th>Series / Model / Trim</th><th>Inv</th><th>Pipe</th><th>Del</th><th>Total</th></tr></thead><tbody>${trims.map(t => `<tr><td>${esc(t.trim)}</td><td>${t.Inventory || ''}</td><td>${t.Pipeline || ''}</td><td>${t.Delivery || ''}</td><td><b>${t.count}</b></td></tr>`).join('')}<tr style="border-top:2px solid var(--line)"><td><b>Total</b></td><td><b>${newC.Inventory}</b></td><td><b>${newC.Pipeline}</b></td><td><b>${newC.Delivery}</b></td><td><b>${nv.length}</b></td></tr></tbody></table>` : `<div class="empty">No new vehicles — add them in Inventory.</div>`}
    </div></div>
    <div class="panel"><div class="hd">🔥 Hot clients with matches</div><div class="bd">
      ${hotMatch.length ? `<table><tbody>${hotMatch.map(x => { const m = x.ms[0]; return `<tr class="clk" data-go="#/client/${x.c.id}"><td><b>${esc(x.c.name)}</b></td><td>${x.ms.length} match${x.ms.length > 1 ? 'es' : ''}</td><td>${esc(vehLabel(m.v))} · <span class="${m.fit.cls}">${m.fit.t}</span></td></tr>`; }).join('')}</tbody></table>` : `<div class="empty">No hot clients with in-budget matches yet.</div>`}
    </div></div>
    <div class="panel"><div class="hd">🔔 Build matches — in stock / incoming</div><div class="bd">
      ${(function(){ var a = buildAlerts(); return a.length ? `<table><tbody>${a.map(function(z){ return `<tr class="clk" data-go="#/client/${z.c.id}"><td><b>${esc(z.c.name)}</b></td><td>${esc(vehLabel(z.x.v))} ${esc(z.x.v.color || '')}</td><td>${z.x.avail === 'In stock' ? '<span class="fit-in">In stock</span>' : '<span style="color:var(--warm)">' + esc(z.x.avail) + '</span>'}</td></tr>`; }).join('')}</tbody></table>` : `<div class="empty">No build-spec clients match current/incoming stock yet.</div>`; })()}
    </div></div>
    <div class="panel"><div class="hd">✓ Tasks & 🔁 reposts due</div><div class="bd">
      ${(tasks.length || reposts.length) ? `<table><tbody>${tasks.map(t => `<tr><td>✓ ${esc(t.title)}${t.clientId ? ' · <a href="#/client/' + t.clientId + '">' + esc((client(t.clientId) || {}).name || '') + '</a>' : ''}</td><td style="color:var(--muted)">${esc(t.due || '')}</td></tr>`).join('')}${reposts.map(x => `<tr><td>🔁 Repost ${esc(x.v.ref)} · ${esc(vehLabel(x.v))}</td><td><button class="btn sm" data-post="${x.v.id}">Posted</button></td></tr>`).join('')}</tbody></table>` : `<div class="empty">Nothing due. 🎉</div>`}
    </div></div>
  </div>`;
}
function vehLabel(v) { return [v.year, (v.kind === 'Used' ? v.make : v.series), v.model, v.suffix].filter(Boolean).join(' '); }

function viewClients() {
  const rows = DB.clients.slice().sort((a, b) => (b.lastContact || 0) - (a.lastContact || 0));
  return `<div class="row" style="align-items:center"><h1>Clients</h1><button class="btn primary right" data-add="client">+ New client</button></div>
  <p class="sub">${rows.length} clients · click a row to open the record</p>
  <div class="panel"><div class="bd">
  <table><thead><tr><th>Name</th><th>Status</th><th>Looking for</th><th>Budget</th><th>Matches</th><th>Last contact</th></tr></thead><tbody>
  ${rows.map(c => {
    const want = [c.year, c.series || c.make, c.model, c.color].filter(Boolean).join(' ') || '—';
    const mc = matchesForClient(c).length;
    return `<tr class="clk" data-go="#/client/${c.id}"><td><b>${esc(c.name)}</b><div style="color:var(--muted);font-size:12px">${esc(c.phone || '')}</div></td><td>${badge(c.status)}</td><td>${esc(want)}</td><td>${money(c.budget)}</td><td>${mc ? mc : '<span style="color:var(--muted)">0</span>'}</td><td style="color:var(--muted)">${c.lastContact ? fmtDate(c.lastContact) : '—'}</td></tr>`;
  }).join('') || `<tr><td colspan="6" class="empty">No clients yet.</td></tr>`}
  </tbody></table></div></div>`;
}

function viewClient(id) {
  const c = client(id); if (!c) return '<div class="empty">Client not found. <a href="#/clients">Back</a></div>';
  const acts = DB.activities.filter(a => a.clientId === id).sort((a, b) => b.at - a.at);
  const ms = matchesForClient(c);
  const iv = interestedVehicles(c);
  const tasks = DB.tasks.filter(t => t.clientId === id);
  return `<div class="row" style="align-items:center">
    <a href="#/clients" class="btn ghost sm">← Clients</a>
    <h1 style="margin:0 8px">${esc(c.name)}</h1> ${badge(c.status)} <span class="pill">${esc(c.stage || 'New Lead')}</span>
    <span class="right"><button class="btn" data-build="${c.id}">🔧 Build a car</button> <button class="btn" data-edit="${c.id}">Edit</button></span>
  </div>
  <div class="detail" style="margin-top:14px">
    <div>
      <div class="panel"><div class="hd">Profile</div><div class="bd">
        ${field('Phone', c.phone)}${field('Email', c.email)}${field('Budget', money(c.budget))}
        ${field('Looking for', [c.year, c.series, c.model, c.color].filter(Boolean).join(' ') || '—')}
        ${field('Make (used)', c.make)}${field('Max Km', c.maxKm)}
        ${(c.ownYear || c.ownSeries) ? field('Currently drives', [c.ownYear, c.ownSeries, c.ownModel].filter(Boolean).join(' ')) : ''}
        ${c.tradeValue ? field('Trade-in', money(c.tradeValue) + (c.lienOwing ? ' (lien ' + money(c.lienOwing) + ')' : '')) : ''}
        ${field('Last contact', c.lastContact ? fmtDate(c.lastContact) : '—')}
      </div></div>
      <div class="panel" style="margin-top:14px"><div class="hd">Notes</div><div class="bd">${esc(c.notes || '') || '<span style="color:var(--muted)">No notes.</span>'}</div></div>
      ${(c.model || c.year || c.color || c.intColor || c.package || c.features) ? `<div class="panel" style="margin-top:14px"><div class="hd">🔧 Car build</div><div class="bd"><div>${esc([c.year, c.model].filter(Boolean).join(' '))}${c.color ? ' · ' + esc(c.color) : ''}${c.intColor ? ' / ' + esc(c.intColor) + ' int' : ''}${c.package ? ' · ' + esc(c.package) : ''}</div>${c.features ? `<div style="color:var(--muted);font-size:12px;margin-top:3px">${esc(c.features)}</div>` : ''}<div style="margin-top:6px">${(function(){ var r = rankBuild(c); var inh = r.filter(function(x){ return x.avail==='In stock'||x.avail==='Incoming'||x.avail==='Delivery'; }).length; return r.length ? `<b>${r.length}</b> close · <b>${inh}</b> in stock/incoming · <a href="#" data-build="${c.id}">open builder</a>` : 'No matches yet.'; })()}</div></div></div>` : ''}
      ${tasks.length ? `<div class="panel" style="margin-top:14px"><div class="hd">Tasks</div><div class="bd"><table><tbody>${tasks.map(t => `<tr><td>${t.done ? '✅' : '⬜'} ${esc(t.title)}</td><td style="color:var(--muted)">${esc(t.due || '')}</td><td><button class="btn sm" data-task-done="${t.id}">${t.done ? 'Reopen' : 'Done'}</button></td></tr>`).join('')}</tbody></table></div></div>` : ''}
    </div>
    <div>
      <div class="panel"><div class="hd">Activity & history</div><div class="bd">
        <div class="row" style="margin-bottom:10px">
          <select id="actType" style="padding:8px;border:1px solid var(--line);border-radius:8px">
            <option>Note</option><option>Call</option><option>Email</option><option>Meeting</option><option>Text</option>
          </select>
          <input id="actBody" placeholder="Log a note, call, email…" style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px">
          <button class="btn primary" id="actAdd">Log</button>
          <button class="btn" data-add-task="${c.id}">+ Task</button>
        </div>
        <ul class="timeline">
          ${acts.map(a => `<li class="tl-${a.type}"><b>${esc(a.type)}</b> — ${esc(a.body)}<div class="meta">${fmtWhen(a.at)} <button class="btn ghost sm" data-del-act="${a.id}">delete</button></div></li>`).join('') || '<div class="empty">No activity yet — log your first note above.</div>'}
        </ul>
      </div></div>
      <div class="panel" style="margin-top:14px"><div class="hd">★ Interested in (${iv.length})</div><div class="bd">
        <div class="row" style="margin-bottom:8px"><select id="interestPick" style="flex:1;padding:8px;border:1px solid var(--line);border-radius:8px"><option value="">+ tag a vehicle they like…</option>${DB.vehicles.map(v => `<option value="${v.id}">${esc(vehLabel(v))} ${esc(v.color || '')} · ${esc(v.ref || v.vin || '')}</option>`).join('')}</select><button class="btn" id="interestAdd">Tag</button></div>
        ${iv.length ? `<table><tbody>${iv.map(v => `<tr><td><span class="pill">${v.kind}</span> ${esc(vehLabel(v))} ${esc(v.color || '')}</td><td>${esc(v.ref || v.vin || '')}</td><td>${money(v.kind === 'New' ? pricingLookup(v.year, v.series, v.model, v.suffix) : num(v.price))}</td><td><button class="btn ghost sm" data-untag="${v.id}">remove</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nothing tagged yet — tag from suggestions below or the picker.</div>'}
      </div></div>
      <div class="panel" style="margin-top:14px"><div class="hd">⇄ Vehicle suggestions + auto-quotes (${ms.length})</div><div class="bd">
        ${ms.length ? `<table><thead><tr><th>Type</th><th>Vehicle</th><th>Price</th><th>Fit</th><th>Finance</th><th>Lease</th><th></th></tr></thead><tbody>${ms.map(m => { const q = buildQuote(m.v, c, {}); return `<tr><td><span class="pill">${m.type}</span></td><td>${esc(vehLabel(m.v))} ${esc(m.v.color || '')}<div style="color:var(--muted);font-size:12px">${esc(m.v.ref || m.v.vin || '')}</div></td><td>${money(m.price)}</td><td><span class="${m.fit.cls}">${m.fit.t}</span></td><td>${q ? mo(q.finMo) : '—'}</td><td>${q && q.leaseMo != null ? mo(q.leaseMo) : '—'}</td><td><button class="btn ghost sm" data-quote="${m.v.id}">Quote</button> <button class="btn ghost sm" data-tag="${m.v.id}">${(c.interested || []).indexOf(m.v.id) >= 0 ? '★' : '☆'}</button></td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">No matching vehicles in stock.</div>'}
      </div></div>
    </div>
  </div>`;
}
function field(l, v) { return `<div class="field"><label>${esc(l)}</label><div>${esc(v || '—') || '—'}</div></div>`; }

function viewInventory() {
  const nv = DB.vehicles.filter(v => v.kind === 'New'), uv = DB.vehicles.filter(v => v.kind === 'Used');
  const nrow = v => `<tr class="clk" data-veh="${v.id}"><td><span class="pill">${esc(v.stage)}</span></td><td>${esc(v.ref)}</td><td>${esc(vehLabel(v))}</td><td>${esc(v.color)}</td><td>${esc(v.status)}</td><td>${esc(v.customer || '')}</td><td style="color:var(--muted)">${esc(v.etaTo || '')}</td></tr>`;
  const urow = v => { const r = repostDue(v); return `<tr class="clk" data-veh="${v.id}"><td>${esc(v.ref)}</td><td>${esc(vehLabel(v))}</td><td>${esc(v.color)}</td><td>${v.km ? Number(v.km).toLocaleString() : ''}</td><td>${money(v.price)}</td><td>${esc(v.status)}</td><td>${r ? (r.over ? '<span style="color:var(--accent)">repost</span>' : 'ok') : ''}</td></tr>`; };
  return `<div class="row" style="align-items:center"><h1>Inventory</h1><button class="btn primary right" data-add="vehicle">+ Vehicle</button></div>
  <div class="panel" style="margin-top:6px"><div class="hd">New (${nv.length})</div><div class="bd"><table><thead><tr><th>Stage</th><th>Order#</th><th>Vehicle</th><th>Color</th><th>Status</th><th>Customer</th><th>ETA</th></tr></thead><tbody>${nv.map(nrow).join('') || '<tr><td colspan="7" class="empty">No new vehicles.</td></tr>'}</tbody></table></div></div>
  <div class="panel" style="margin-top:14px"><div class="hd">Used (${uv.length})</div><div class="bd"><table><thead><tr><th>Stk#</th><th>Vehicle</th><th>Colour</th><th>Km</th><th>Retail</th><th>Status</th><th>Repost</th></tr></thead><tbody>${uv.map(urow).join('') || '<tr><td colspan="7" class="empty">No used vehicles.</td></tr>'}</tbody></table></div></div>`;
}

function viewMatches() {
  let rows = [];
  DB.clients.forEach(c => matchesForClient(c).forEach(m => rows.push({ c, m })));
  rows.sort((a, b) => a.c.name.localeCompare(b.c.name));
  const cap = 500, total = rows.length, shown = rows.slice(0, cap);
  return `<div class="row" style="align-items:center"><h1>Matches</h1><label class="right" style="color:var(--muted)"><input type="checkbox" id="inBudgetOnly"> in-budget only</label></div>
  <p class="sub">${total} client↔vehicle matches${total > cap ? ` · showing first ${cap} — fill in a client's wants to narrow` : ''}</p>
  <div class="panel"><div class="bd"><table id="matchTbl"><thead><tr><th>Client</th><th>Status</th><th>Type</th><th>Vehicle</th><th>Ref</th><th>Price</th><th>Fit</th></tr></thead><tbody>
  ${shown.map(r => `<tr data-fit="${r.m.fit.cls}"><td class="clk" data-go="#/client/${r.c.id}"><b>${esc(r.c.name)}</b></td><td>${badge(r.c.status)}</td><td><span class="pill">${r.m.type}</span></td><td>${esc(vehLabel(r.m.v))} ${esc(r.m.v.color || '')}</td><td>${esc(r.m.v.ref || r.m.v.vin || '')}</td><td>${money(r.m.price)}</td><td><span class="${r.m.fit.cls}">${r.m.fit.t}</span></td></tr>`).join('') || '<tr><td colspan="7" class="empty">No matches yet.</td></tr>'}
  </tbody></table></div></div>`;
}

function viewUpsell() {
  let rows = [];
  DB.clients.forEach(c => upsellForClient(c).forEach(u => rows.push({ c, u })));
  rows.sort((a, b) => (b.u.price || 0) - (a.u.price || 0));
  const cap = 500, total = rows.length, shown = rows.slice(0, cap);
  return `<h1>Upsell</h1><p class="sub">${total} upgrade opportunities${total > cap ? ` · showing first ${cap}` : ''} — existing customers → newer / higher-series vehicles. Set a client's <b>“Currently drives”</b> to surface these.</p>
  <div class="panel"><div class="bd"><table><thead><tr><th>Customer</th><th>Currently drives</th><th>Suggested</th><th>Type</th><th>Price</th><th>Finance</th><th></th></tr></thead><tbody>
  ${shown.map(r => { const q = buildQuote(r.u.v, r.c, {}); return `<tr><td class="clk" data-go="#/client/${r.c.id}"><b>${esc(r.c.name)}</b></td><td style="color:var(--muted)">${esc([r.c.ownYear, r.c.ownSeries, r.c.ownModel].filter(Boolean).join(' '))}</td><td>${esc(vehLabel(r.u.v))} ${esc(r.u.v.color || '')}</td><td><span class="pill">${r.u.type}</span></td><td>${money(r.u.price)}</td><td>${q ? mo(q.finMo) : '—'}</td><td><button class="btn ghost sm" data-quote="${r.u.v.id}" data-qc="${r.c.id}">Quote</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">No upsell opportunities. Add “Currently drives” to your Customer-status clients.</td></tr>'}
  </tbody></table></div></div>`;
}

function viewPipeline() {
  return `<div class="row" style="align-items:center"><h1>Pipeline</h1><button class="btn primary right" data-add="client">+ New client</button></div>
  <p class="sub">Drag a card between stages (or use its dropdown). Each card shows interest tags + live match count. Tag vehicles on the client's page.</p>
  <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px">
  ${STAGES.map(stage => {
    const list = DB.clients.filter(c => (c.stage || 'New Lead') === stage);
    return `<div class="kcol" data-stage="${esc(stage)}" style="min-width:228px;flex:1 0 228px">
      <div class="panel"><div class="hd">${esc(stage)}<span class="right pill">${list.length}</span></div>
      <div class="bd" style="min-height:80px">
      ${list.map(c => { const iv = interestedVehicles(c); const mc = matchesForClient(c).length;
        return `<div class="kcard card" draggable="true" data-client="${c.id}" style="margin-bottom:8px;cursor:grab">
          <div class="row" style="justify-content:space-between;align-items:center"><b class="clk" data-go="#/client/${c.id}">${esc(c.name)}</b>${badge(c.status)}</div>
          <div style="color:var(--muted);font-size:12px;margin:4px 0">${c.budget ? money(c.budget) + ' budget' : 'no budget'} · ${mc} match${mc === 1 ? '' : 'es'}</div>
          ${iv.length ? `<div>${iv.map(v => `<span class="pill" style="margin:2px 2px 0 0">${esc(vehLabel(v))}</span>`).join('')}</div>` : '<div style="color:var(--muted);font-size:12px">no interest tagged</div>'}
          <select data-stage-sel="${c.id}" style="margin-top:6px;width:100%;padding:5px;border:1px solid var(--line);border-radius:6px">${STAGES.map(s => `<option ${s === stage ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
        </div>`;
      }).join('') || '<div class="empty" style="padding:8px">—</div>'}
      </div></div></div>`;
  }).join('')}
  </div>`;
}

function viewTasks() {
  const open = DB.tasks.filter(t => !t.done).sort((a, b) => (Date.parse(a.due) || 9e15) - (Date.parse(b.due) || 9e15));
  const done = DB.tasks.filter(t => t.done);
  const reposts = DB.vehicles.map(v => ({ v, r: repostDue(v) })).filter(x => x.r && x.r.over);
  return `<div class="row" style="align-items:center"><h1>Tasks</h1><button class="btn primary right" data-add-task="">+ Task</button></div>
  <div class="panel" style="margin-top:6px"><div class="hd">Open (${open.length})</div><div class="bd"><table><tbody>
  ${open.map(t => `<tr><td><button class="btn sm" data-task-done="${t.id}">⬜</button></td><td>${esc(t.title)}${t.clientId ? ' · <a href="#/client/' + t.clientId + '">' + esc((client(t.clientId) || {}).name || '') + '</a>' : ''}</td><td style="color:var(--muted)">${esc(t.due || '')}</td><td><button class="btn ghost sm" data-task-del="${t.id}">✕</button></td></tr>`).join('') || '<tr><td class="empty">No open tasks.</td></tr>'}
  </tbody></table></div></div>
  <div class="panel" style="margin-top:14px"><div class="hd">🔁 Facebook reposts due (${reposts.length})</div><div class="bd"><table><tbody>
  ${reposts.map(x => `<tr><td>${esc(x.v.ref)} · ${esc(vehLabel(x.v))}</td><td>${x.r.never ? 'Never posted' : 'Due'}</td><td><button class="btn sm" data-post="${x.v.id}">Mark posted today</button> <a class="btn sm" target="_blank" href="${outlookLink('Repost ' + vehLabel(x.v) + ' on FB Marketplace', todayStr())}">📅 Add</a></td></tr>`).join('') || '<tr><td class="empty">No reposts due.</td></tr>'}
  </tbody></table></div></div>
  ${done.length ? `<div class="panel" style="margin-top:14px"><div class="hd">Done (${done.length})</div><div class="bd"><table><tbody>${done.map(t => `<tr><td>✅ ${esc(t.title)}</td><td><button class="btn sm" data-task-done="${t.id}">Reopen</button></td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
}

function viewSearch(q) {
  const n = norm(q);
  const cl = DB.clients.filter(c => [c.name, c.phone, c.email, c.notes].some(x => norm(x).includes(n)));
  const ve = DB.vehicles.filter(v => [v.ref, v.vin, v.model, v.series, v.make, v.color, v.customer].some(x => norm(x).includes(n)));
  return `<h1>Search “${esc(q)}”</h1>
  <div class="panel" style="margin-top:6px"><div class="hd">Clients (${cl.length})</div><div class="bd"><table><tbody>${cl.map(c => `<tr class="clk" data-go="#/client/${c.id}"><td><b>${esc(c.name)}</b></td><td>${badge(c.status)}</td><td style="color:var(--muted)">${esc(c.phone || '')} ${esc(c.email || '')}</td></tr>`).join('') || '<tr><td class="empty">No clients.</td></tr>'}</tbody></table></div></div>
  <div class="panel" style="margin-top:14px"><div class="hd">Vehicles (${ve.length})</div><div class="bd"><table><tbody>${ve.map(v => `<tr class="clk" data-veh="${v.id}"><td>${esc(v.ref || v.vin)}</td><td>${esc(vehLabel(v))} ${esc(v.color || '')}</td><td><span class="pill">${v.kind}</span></td></tr>`).join('') || '<tr><td class="empty">No vehicles.</td></tr>'}</tbody></table></div></div>`;
}

function viewSettings() {
  const cfg = DB.config;
  return `<h1>Settings</h1>
  <div class="panel"><div class="hd">Backup & restore</div><div class="bd">
    <p class="sub">Your data lives only on this device. Export weekly and keep the file in Google Drive.</p>
    <button class="btn primary" data-act="backup">⬇ Export backup (.json)</button>
    <label class="btn">⬆ Restore from backup<input type="file" id="restoreFile" accept=".json" hidden></label>
    <span style="color:var(--muted);margin-left:8px">Last backup: ${DB.meta.lastBackupAt ? fmtWhen(DB.meta.lastBackupAt) : 'never'}</span>
  </div></div>
  <div class="panel" style="margin-top:14px"><div class="hd">Import CSV</div><div class="bd">
    <p class="sub">Bring in data from your Google Sheet (download a tab as CSV first) or the 2026 pricing file.</p>
    <select id="impType" style="padding:8px;border:1px solid var(--line);border-radius:8px">
      <option value="clients">Clients</option><option value="new">New vehicles (Inventory/Pipeline/Delivery)</option>
      <option value="used">Used vehicles</option><option value="pricing">Pricing (2026)</option>
    </select>
    <label class="btn">Choose CSV…<input type="file" id="impFile" accept=".csv" hidden></label>
    <div style="color:var(--muted);font-size:12px;margin-top:8px">Clients cols: Name,Phone,Email,Budget,Make,Year,Series,Model,Color,MaxKm,Status,Notes · New cols: Stage,Order#,VIN,Year,Series,Model,Suffix,Color,Status,ETA From,ETA To,Customer · Used cols: In-Stock,Stk#,Year,Make,Model,Colour,Km,Retail,Status</div>
  </div></div>
  <div class="panel" style="margin-top:14px"><div class="hd">Rules</div><div class="bd">
    <div class="field"><label>Repost interval (days)</label><input id="cfgRepost" type="number" value="${cfg.repostDays}"></div>
    <div class="field"><label>Default new make</label><input id="cfgMake" value="${esc(cfg.newMake)}"></div>
    <div class="field"><label>Used “unavailable” status keywords (regex)</label><input id="cfgUnavail" value="${esc(cfg.usedUnavail)}"></div>
    <div class="field"><label>Series ladder (JSON: higher = more premium)</label><input id="cfgRank" value='${esc(JSON.stringify(cfg.seriesRank))}'></div>
    <div class="row"><div class="field" style="flex:1"><label>Tax %</label><input id="cfgTax" type="number" value="${cfg.taxRate}"></div><div class="field" style="flex:1"><label>Default APR %</label><input id="cfgApr" type="number" value="${cfg.defaultApr}"></div><div class="field" style="flex:1"><label>Default term (mo)</label><input id="cfgTerm" type="number" value="${cfg.defaultTerm}"></div><div class="field" style="flex:1"><label>Dealer fees $</label><input id="cfgFees" type="number" value="${cfg.fees || 0}"></div></div>
    <button class="btn primary" id="cfgSave">Save rules</button>
  </div></div>
  <div class="panel" style="margin-top:14px"><div class="hd">🔒 Security</div><div class="bd">
    <p class="sub">${CKEY ? 'This device is <b>passcode-protected</b> — data is encrypted at rest (AES-GCM).' : 'No passcode set — data is stored unencrypted on this device.'}</p>
    ${CKEY ? '<button class="btn" id="rmPass">Remove passcode</button>' : '<button class="btn primary" id="setPass">Set a passcode</button>'}
    <div style="color:var(--muted);font-size:12px;margin-top:8px">Encrypts everything with your passcode. No recovery if forgotten — always keep a backup file.</div>
  </div></div>
  <div class="panel" style="margin-top:14px"><div class="hd">Data</div><div class="bd">
    <button class="btn" id="loadSample">Reload sample data</button>
    <button class="btn" id="clearAll" style="color:var(--accent)">Clear all data</button>
    <span style="color:var(--muted);margin-left:8px">Clients ${DB.clients.length} · Vehicles ${DB.vehicles.length} · Pricing ${DB.pricing.length} · Activities ${DB.activities.length}</span>
  </div></div>`;
}

/* ---------- forms / modals ---------- */
function modal(title, bodyHTML, onSave, saveLabel) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-bg"><div class="modal"><div class="hd">${esc(title)}<button class="btn ghost right" data-close>✕</button></div><div class="bd">${bodyHTML}</div><div class="ft"><button class="btn" data-close>Cancel</button>${onSave ? `<button class="btn primary" data-save>${saveLabel || 'Save'}</button>` : ''}</div></div></div>`;
  const close = () => root.innerHTML = '';
  $$('[data-close]', root).forEach(b => b.onclick = close);
  $('.modal-bg', root).onclick = e => { if (e.target.classList.contains('modal-bg')) close(); };
  if (onSave) $('[data-save]', root).onclick = () => { if (onSave() !== false) close(); };
  return root;
}
function inp(k, label, val, type) { return `<div class="field"><label>${esc(label)}</label><input data-k="${k}" type="${type || 'text'}" value="${val == null ? '' : esc(val)}"></div>`; }
function sel(k, label, val, opts) { return `<div class="field"><label>${esc(label)}</label><select data-k="${k}">${opts.map(o => `<option ${norm(o) === norm(val) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`; }
function gather(root) { const o = {}; $$('[data-k]', root).forEach(e => o[e.dataset.k] = e.value.trim()); return o; }

function clientForm(existing) {
  const c = existing || {};
  const body = `<div class="row"><div style="flex:1">${inp('name', 'Name', c.name)}${inp('phone', 'Phone', c.phone)}${inp('email', 'Email', c.email)}${sel('status', 'Status', c.status || 'Warm', ['Hot', 'Warm', 'Cold', 'Customer'])}${sel('stage', 'Pipeline stage', c.stage || 'New Lead', STAGES)}${inp('budget', 'Budget', c.budget, 'number')}</div>
  <div style="flex:1"><div class="field"><label>Looking for (blank = any)</label></div>${inp('year', 'Year', c.year)}${inp('series', 'Series (e.g. RX)', c.series)}${inp('model', 'Model', c.model)}${inp('color', 'Exterior color', c.color)}${inp('intColor', 'Interior color', c.intColor)}${inp('package', 'Package / trim', c.package)}${inp('make', 'Make (used)', c.make)}${inp('maxKm', 'Max Km (used)', c.maxKm, 'number')}${inp('features', 'Must-have features', c.features)}</div></div>
  <hr style="border:0;border-top:1px solid var(--line);margin:6px 0"><div class="row"><div style="flex:1">${inp('ownYear', 'Currently drives — year', c.ownYear)}${inp('ownSeries', '— series', c.ownSeries)}</div><div style="flex:1">${inp('ownModel', '— model', c.ownModel)}${inp('tradeValue', 'Trade-in value', c.tradeValue, 'number')}${inp('lienOwing', 'Lien owing', c.lienOwing, 'number')}</div></div>
  <div class="field"><label>Notes</label><textarea data-k="notes" rows="3">${esc(c.notes || '')}</textarea></div>`;
  modal(existing ? 'Edit client' : 'New client', body, () => {
    const root = $('#modalRoot'); const o = gather(root); o.notes = $('[data-k=notes]', root).value.trim();
    if (!o.name) { toast('Name required'); return false; }
    ['budget', 'maxKm'].forEach(k => o[k] = o[k] === '' ? '' : num(o[k]));
    if (existing) { const prev = existing.status; Object.assign(existing, o); if (norm(prev) !== norm(o.status)) addActivity(existing.id, 'Note', 'Status changed: ' + prev + ' → ' + o.status); }
    else { o.id = uid('c'); o.createdAt = Date.now(); o.lastContact = Date.now(); o.interested = []; if (!o.stage) o.stage = 'New Lead'; DB.clients.push(o); }
    save(); toast('Saved'); route();
  }, 'Save client');
}

function vehicleForm(existing) {
  const v = existing || { kind: 'New', status: 'Available' };
  const ic = existing ? interestedClients(existing.id) : [];
  const body = `${ic.length ? `<div style="margin-bottom:10px;color:var(--muted)">★ Interested clients: ${ic.map(c => `<a href="#/client/${c.id}">${esc(c.name)}</a>`).join(', ')}</div>` : ''}${sel('kind', 'Type', v.kind, ['New', 'Used'])}
  <div class="row"><div style="flex:1">${sel('stage', 'Stage (new)', v.stage || 'Inventory', ['Inventory', 'Pipeline', 'Delivery', ''])}${inp('ref', 'Stock # / Order #', v.ref)}${inp('vin', 'VIN', v.vin)}${inp('year', 'Year', v.year)}${inp('make', 'Make (used)', v.make)}${inp('series', 'Series (new)', v.series)}</div>
  <div style="flex:1">${inp('model', 'Model', v.model)}${inp('suffix', 'Suffix/Trim (new)', v.suffix)}${inp('color', 'Color', v.color)}${inp('km', 'Km (used)', v.km, 'number')}${inp('price', 'Retail price (used)', v.price, 'number')}${inp('status', 'Status', v.status)}</div></div>
  <div class="row"><div style="flex:1">${inp('etaFrom', 'ETA from', v.etaFrom)}${inp('inStock', 'In-stock date (used)', v.inStock)}</div><div style="flex:1">${inp('etaTo', 'ETA to', v.etaTo)}${inp('customer', 'Customer (new)', v.customer)}</div></div>
  ${inp('comments', 'Comments / description', v.comments)}`;
  modal(existing ? 'Edit vehicle' : 'New vehicle', body, () => {
    const o = gather($('#modalRoot'));
    ['km', 'price'].forEach(k => o[k] = o[k] === '' ? '' : num(o[k]));
    if (existing) Object.assign(existing, o); else { o.id = uid('v'); DB.vehicles.push(o); }
    save(); toast('Saved'); route();
  }, 'Save vehicle');
}

function taskForm(clientId) {
  const body = inp('title', 'Task', '') + inp('due', 'Due date', todayStr(), 'date') + (clientId ? '' : sel('clientId', 'Link to client (optional)', '', ['', ...DB.clients.map(c => c.name)]));
  modal('New task', body, () => {
    const o = gather($('#modalRoot')); if (!o.title) { toast('Task text required'); return false; }
    let cid = clientId || null;
    if (!cid && o.clientId) { const c = DB.clients.find(x => x.name === o.clientId); cid = c ? c.id : null; }
    DB.tasks.push({ id: uid('t'), clientId: cid, title: o.title, due: o.due, done: false, createdAt: Date.now() });
    save(); toast('Task added'); route();
  }, 'Add task');
}

function fld(id, label, val) { return '<div class="field" style="flex:1;min-width:88px"><label>' + esc(label) + '</label><input id="' + id + '" type="number" value="' + (val === '' || val == null ? '' : esc(val)) + '"></div>'; }
function quoteModal(vid, cid) {
  var v = vehicle(vid), c = cid ? client(cid) : null; if (!v) return;
  var ids = ['q_price', 'q_apr', 'q_term', 'q_down', 'q_trade', 'q_lien', 'q_tax'];
  function gatherO() { return { price: $('#q_price').value, apr: $('#q_apr').value, term: $('#q_term').value, down: $('#q_down').value, trade: $('#q_trade').value, lien: $('#q_lien').value, taxRate: $('#q_tax').value }; }
  function render() {
    var q = buildQuote(v, c, gatherO()), out = $('#q_out');
    if (!q) { out.innerHTML = '<div class="empty">No price on file for this vehicle.</div>'; return; }
    out.innerHTML = '<div class="row" style="gap:22px;margin:4px 0 8px">' +
      '<div><div class="l">Finance</div><div style="font-size:24px;font-weight:700;color:var(--accent)">' + mo(q.finMo) + '</div><div style="color:var(--muted);font-size:12px">' + q.term + ' mo @ ' + q.apr + '% · tax in</div></div>' +
      (q.leaseMo != null ? '<div><div class="l">Lease</div><div style="font-size:24px;font-weight:700">' + mo(q.leaseMo) + '</div><div style="color:var(--muted);font-size:12px">' + q.lease.term + ' mo · ' + (q.lease.km || 0).toLocaleString() + ' km/yr · +tax</div></div>' : '') +
      '</div><table><tbody>' +
      '<tr><td>Vehicle price</td><td>' + money(q.price) + '</td></tr>' +
      '<tr><td>Trade-in − lien</td><td>' + money(q.trade) + ' − ' + money(q.lien) + '</td></tr>' +
      '<tr><td>Taxable</td><td>' + money(q.taxable) + '</td></tr>' +
      '<tr><td>Tax (' + q.taxRate + '%)</td><td>' + money(Math.round(q.tax)) + '</td></tr>' +
      '<tr><td><b>Amount financed</b></td><td><b>' + money(Math.round(q.financed)) + '</b></td></tr></tbody></table>';
  }
  var cfg = DB.config, base = v.kind === 'New' ? pricingLookup(v.year, v.series, v.model, v.suffix) : num(v.price);
  var body = '<div style="font-weight:600;margin-bottom:8px">' + esc(vehLabel(v)) + ' ' + esc(v.color || '') + (c ? ' — ' + esc(c.name) : '') + '</div>' +
    '<div class="row">' + fld('q_price', 'Price', base || '') + fld('q_apr', 'APR %', cfg.defaultApr) + fld('q_term', 'Term (mo)', cfg.defaultTerm) + fld('q_down', 'Cash down', cfg.defaultDown || 0) +
    fld('q_trade', 'Trade-in', (c && c.tradeValue) || 0) + fld('q_lien', 'Lien owing', (c && c.lienOwing) || 0) + fld('q_tax', 'Tax %', cfg.taxRate) + '</div><div id="q_out"></div>';
  modal('Payment quote', body, function () {
    if (c) { var q = buildQuote(v, c, gatherO()); addActivity(c.id, 'Note', 'Quote — ' + vehLabel(v) + ': ' + mo(q.finMo) + ' finance' + (q.leaseMo != null ? ' / ' + mo(q.leaseMo) + ' lease' : '')); toast('Quote saved to timeline'); }
    return true;
  }, c ? 'Save to timeline' : 'Close');
  ids.forEach(function (id) { var e = $('#' + id); if (e) e.oninput = render; });
  render();
}

function buildScore(c, v) {
  var s = 0;
  if (c.model && _core(v.model).indexOf(_core(c.model)) >= 0) s += 100;
  else if (c.series && _nser(v.series || '') === _nser(c.series)) s += 50;
  else if (c.series && _nser(v.make || '') === _nser(c.series)) s += 40;
  if (c.year) { var dy = Math.abs((num(v.year) || 0) - (num(c.year) || 0)); if (dy === 0) s += 40; else if (dy === 1) s += 20; else if (dy === 2) s += 8; }
  if (c.features) { var ft = norm(c.features).split(/[,;\/]+|\s+/).filter(Boolean); var hay = norm((v.comments || '') + ' ' + (v.suffix || '') + ' ' + (v.model || '') + ' ' + (v.color || '')); var h = 0; ft.forEach(function (t) { if (t.length > 1 && hay.indexOf(t) >= 0) h++; }); if (ft.length) s += Math.round(30 * h / ft.length); }
  if (c.intColor && norm((v.color || '') + ' ' + (v.comments || '')).indexOf(norm(c.intColor)) >= 0) s += 20;
  if (c.color && norm(v.color || '').indexOf(norm(c.color)) >= 0) s += 10;
  return s;
}
function availTag(v) { if (v.kind === 'Used') return usedAvailable(v) ? 'In stock' : 'Sold'; return v.stage === 'Inventory' ? 'In stock' : (v.stage === 'Pipeline' ? 'Incoming' : (v.stage === 'Delivery' ? 'Delivery' : '')); }
function rankBuild(c) {
  if (!(c.model || c.series || c.year || c.color || c.intColor || c.features || c.package)) return [];
  var arr = DB.vehicles.map(function (v) { return { v: v, score: buildScore(c, v), avail: availTag(v) }; }).filter(function (x) { return x.score > 0; });
  var rk = { 'In stock': 0, 'Incoming': 1, 'Delivery': 2 };
  arr.sort(function (a, b) { if (b.score !== a.score) return b.score - a.score; return (rk[a.avail] == null ? 9 : rk[a.avail]) - (rk[b.avail] == null ? 9 : rk[b.avail]); });
  return arr;
}
function buildExact(x) { return x.score >= 100; }
function buildAlerts() {
  return DB.clients.map(function (c) { var r = rankBuild(c); for (var i = 0; i < r.length; i++) { if (buildExact(r[i]) && (r[i].avail === 'In stock' || r[i].avail === 'Incoming' || r[i].avail === 'Delivery')) return { c: c, x: r[i] }; } return null; }).filter(Boolean);
}
function uniqueModels() { var s = {}; DB.vehicles.forEach(function (v) { if (v.model) s[v.model] = 1; }); return Object.keys(s).sort(); }
function uniqueTrims() { var s = {}; DB.pricing.forEach(function (p) { if (p.suffix) s[p.suffix] = 1; }); return Object.keys(s).sort(); }
function seriesFromModel(m) { if (!m) return ''; var up = String(m).toUpperCase(); var L = ['RZ', 'RX', 'NX', 'UX', 'GX', 'LX', 'ES', 'IS', 'LS', 'LC', 'TX', 'RC']; for (var i = 0; i < L.length; i++) if (up.indexOf(L[i]) >= 0) return L[i]; return ''; }
function bfld(id, label, val, list) { var dl = '', attr = ''; if (list) { dl = '<datalist id="' + id + '_l">' + list.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>'; attr = ' list="' + id + '_l"'; } return '<div class="field" style="flex:1;min-width:130px"><label>' + esc(label) + '</label><input id="' + id + '"' + attr + ' value="' + (val == null ? '' : esc(val)) + '">' + dl + '</div>'; }
function buildModal(cid) {
  var c = client(cid); if (!c) return;
  function spec() { return Object.assign({}, c, { model: $('#b_model').value.trim(), year: $('#b_year').value.trim(), color: $('#b_color').value.trim(), intColor: $('#b_intColor').value.trim(), package: $('#b_package').value.trim(), features: $('#b_features').value.trim(), series: seriesFromModel($('#b_model').value) || c.series || '' }); }
  function render() {
    var sp = spec(), r = rankBuild(sp).slice(0, 12), out = $('#b_out');
    out.innerHTML = r.length ? '<table><thead><tr><th>Match</th><th>Vehicle</th><th>Avail</th><th>Finance</th><th></th></tr></thead><tbody>' + r.map(function (x) {
      var q = buildQuote(x.v, c, {});
      var av = x.avail === 'In stock' ? '<span class="fit-in">In stock</span>' : (x.avail ? '<span style="color:var(--warm)">' + esc(x.avail) + '</span>' : '—');
      return '<tr><td>' + (buildExact(x) ? '<span class="badge2 b-cust">exact</span>' : '<span class="pill">' + x.score + '</span>') + '</td><td>' + esc(vehLabel(x.v)) + ' ' + esc(x.v.color || '') + '<div style="color:var(--muted);font-size:12px">' + esc(x.v.ref || x.v.vin || '') + '</div></td><td>' + av + '</td><td>' + (q ? mo(q.finMo) : '—') + '</td><td><button class="btn ghost sm" data-quote="' + x.v.id + '" data-qc="' + c.id + '">Quote</button> <button class="btn ghost sm" data-tag="' + x.v.id + '">' + ((c.interested || []).indexOf(x.v.id) >= 0 ? '★' : '☆') + '</button></td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty">Fill the spec above to see closest in-stock & incoming matches.</div>';
  }
  var body = '<div class="row">' + bfld('b_model', 'Model', c.model, uniqueModels()) + bfld('b_year', 'Year', c.year) + bfld('b_color', 'Exterior color', c.color) + bfld('b_intColor', 'Interior color', c.intColor) + bfld('b_package', 'Package / trim', c.package, uniqueTrims()) + bfld('b_features', 'Must-have features', c.features) + '</div><div style="color:var(--muted);font-size:12px;margin:4px 0 8px">Ranked: model → year → features → interior → exterior, across in-stock + incoming. Exact = model matched.</div><div id="b_out"></div>';
  modal('🔧 Car builder — ' + esc(c.name), body, function () {
    ['model', 'year', 'color', 'intColor', 'package', 'features'].forEach(function (k) { c[k] = $('#b_' + k).value.trim(); });
    c.series = seriesFromModel(c.model) || c.series;
    save(); addActivity(c.id, 'Note', 'Car build saved: ' + [c.year, c.model, c.color, c.intColor, c.package, c.features].filter(Boolean).join(' / ')); toast('Build saved to profile'); route(); return true;
  }, 'Save build to profile');
  ['b_model', 'b_year', 'b_color', 'b_intColor', 'b_package', 'b_features'].forEach(function (id) { var e = $('#' + id); if (e) e.oninput = render; });
  render();
}

/* ---------- import ---------- */
function importCSV(kind, text) {
  const rows = parseCSV(text); if (rows.length < 2) { toast('Empty CSV'); return; }
  const body = rows.slice(1); let n = 0;
  if (kind === 'clients') body.forEach(r => { if (!r[0]) return; DB.clients.push({ id: uid('c'), name: r[0], phone: r[1] || '', email: r[2] || '', budget: num(r[3]) ?? '', make: r[4] || '', year: r[5] || '', series: r[6] || '', model: r[7] || '', color: r[8] || '', maxKm: num(r[9]) ?? '', status: r[10] || 'Warm', notes: r[11] || '', ownYear: '', ownSeries: '', ownModel: '', stage: 'New Lead', interested: [], createdAt: Date.now(), lastContact: Date.now() }); n++; });
  else if (kind === 'new') body.forEach(r => { if (!r[1] && !r[2]) return; DB.vehicles.push({ id: uid('v'), kind: 'New', stage: r[0] || 'Inventory', ref: r[1] || '', vin: r[2] || '', year: r[3] || '', series: r[4] || '', make: DB.config.newMake, model: r[5] || '', suffix: r[6] || '', color: r[7] || '', status: r[8] || '', etaFrom: r[9] || '', etaTo: r[10] || '', customer: r[11] || '', comments: r[12] || '' }); n++; });
  else if (kind === 'used') body.forEach(r => { if (!r[1]) return; DB.vehicles.push({ id: uid('v'), kind: 'Used', stage: '', inStock: r[0] || '', ref: r[1] || '', year: r[2] || '', make: r[3] || '', model: r[4] || '', color: r[5] || '', km: num(r[6]) ?? '', price: num(r[7]) ?? '', status: r[8] || 'Available', comments: r[9] || '', lastPostedAt: 0 }); n++; });
  else if (kind === 'pricing') { DB.pricing = loadPricingFromCSV(text); n = DB.pricing.length; }
  save(); toast(n + ' rows imported'); route();
}

/* ---------- backup ---------- */
function exportBackup() {
  download('vincere-crm-backup-' + todayStr() + '.json', JSON.stringify(DB, null, 2));
  DB.meta.lastBackupAt = Date.now(); save(); renderNav((location.hash.slice(1) || '/dashboard').split('/')[1]); route();
  toast('Backup downloaded — save it to Google Drive');
}
function restoreBackup(text) {
  try { const d = JSON.parse(text); if (!d.clients) throw 0; DB = d; if (!DB.meta) DB.meta = {}; ensureData(); save(); toast('Restored'); location.hash = '#/dashboard'; route(); }
  catch (e) { toast('That file is not a valid backup'); }
}

/* ---------- event binding ---------- */
function bindView(view, arg) {
  $$('[data-go]').forEach(e => e.onclick = () => location.hash = e.dataset.go);
  $$('[data-veh]').forEach(e => e.onclick = () => vehicleForm(vehicle(e.dataset.veh)));
  $$('[data-quote]').forEach(e => e.onclick = () => quoteModal(e.dataset.quote, e.dataset.qc || (view === 'client' ? arg : null)));
  $$('[data-build]').forEach(e => e.onclick = (ev) => { if (ev && ev.preventDefault) ev.preventDefault(); buildModal(e.dataset.build); });
  $$('[data-act=backup]').forEach(e => e.onclick = exportBackup);
  $$('[data-add=client]').forEach(e => e.onclick = () => clientForm(null));
  $$('[data-add=vehicle]').forEach(e => e.onclick = () => vehicleForm(null));
  $$('[data-edit]').forEach(e => e.onclick = () => clientForm(client(e.dataset.edit)));
  $$('[data-add-task]').forEach(e => e.onclick = () => taskForm(e.dataset.addTask || null));
  $$('[data-post]').forEach(e => e.onclick = () => { const v = vehicle(e.dataset.post); v.lastPostedAt = Date.now(); save(); toast('Marked posted today'); route(); });
  $$('[data-task-done]').forEach(e => e.onclick = () => { const t = DB.tasks.find(x => x.id === e.dataset.taskDone); t.done = !t.done; save(); route(); });
  $$('[data-task-del]').forEach(e => e.onclick = () => { DB.tasks = DB.tasks.filter(x => x.id !== e.dataset.taskDel); save(); route(); });
  $$('[data-del-act]').forEach(e => e.onclick = () => { DB.activities = DB.activities.filter(x => x.id !== e.dataset.delAct); save(); route(); });

  if (view === 'client') {
    const add = $('#actAdd'); if (add) add.onclick = () => { addActivity(arg, $('#actType').value, $('#actBody').value); route(); };
    const body = $('#actBody'); if (body) body.onkeydown = e => { if (e.key === 'Enter') { addActivity(arg, $('#actType').value, body.value); route(); } };
    const ia = $('#interestAdd'); if (ia) ia.onclick = () => { const id = $('#interestPick').value; if (id) { toggleInterest(arg, id); route(); } };
    $$('[data-untag]').forEach(e => e.onclick = () => { toggleInterest(arg, e.dataset.untag); route(); });
    $$('[data-tag]').forEach(e => e.onclick = () => { toggleInterest(arg, e.dataset.tag); route(); });
  }
  if (view === 'pipeline') {
    $$('[data-stage-sel]').forEach(s => s.onchange = () => { const c = client(s.dataset.stageSel); if (c) { c.stage = s.value; save(); route(); } });
    $$('.kcard').forEach(card => { card.ondragstart = e => e.dataTransfer.setData('id', card.dataset.client); });
    $$('.kcol').forEach(col => { col.ondragover = e => e.preventDefault(); col.ondrop = e => { e.preventDefault(); const c = client(e.dataTransfer.getData('id')); if (c) { c.stage = col.dataset.stage; save(); route(); } }; });
  }
  if (view === 'matches') {
    const cb = $('#inBudgetOnly'); if (cb) cb.onchange = () => { $$('#matchTbl tbody tr').forEach(tr => { tr.style.display = (!cb.checked || tr.dataset.fit === 'fit-in') ? '' : 'none'; }); };
  }
  if (view === 'settings') {
    $('#restoreFile') && ($('#restoreFile').onchange = e => readFile(e, restoreBackup));
    $('#impFile') && ($('#impFile').onchange = e => readFile(e, t => importCSV($('#impType').value, t)));
    $('#cfgSave') && ($('#cfgSave').onclick = () => {
      DB.config.repostDays = num($('#cfgRepost').value) || 10; DB.config.newMake = $('#cfgMake').value.trim();
      DB.config.usedUnavail = $('#cfgUnavail').value.trim();
      try { DB.config.seriesRank = JSON.parse($('#cfgRank').value); } catch (e) { toast('Series ladder must be valid JSON'); return; }
      DB.config.taxRate = num($('#cfgTax').value) || 0; DB.config.defaultApr = num($('#cfgApr').value) || 0; DB.config.defaultTerm = num($('#cfgTerm').value) || 60; DB.config.fees = num($('#cfgFees').value) || 0;
      save(); toast('Rules saved'); route();
    });
    $('#setPass') && ($('#setPass').onclick = setPasscode);
    $('#rmPass') && ($('#rmPass').onclick = removePasscode);
    $('#loadSample') && ($('#loadSample').onclick = () => { if (confirm('Replace current data with sample data?')) { seed(); location.hash = '#/dashboard'; route(); } });
    $('#clearAll') && ($('#clearAll').onclick = () => { if (confirm('Erase ALL data on this device? Make sure you have a backup.')) { DB = { clients: [], activities: [], vehicles: [], pricing: PRICING.map(function(p){return Object.assign({},p);}), tasks: [], config: defaultConfig(), meta: { createdAt: Date.now(), lastBackupAt: 0 } }; save(); location.hash = '#/dashboard'; route(); } });
  }
}
function readFile(e, cb) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => cb(r.result); r.readAsText(f); e.target.value = ''; }

/* ---------- init ---------- */
async function init() {
  $('#globalSearch').onkeydown = e => { if (e.key === 'Enter' && e.target.value.trim()) location.hash = '#/search/' + encodeURIComponent(e.target.value.trim()); };
  $('#quickAddClient').onclick = () => clientForm(null);
  $('#quickBackup').onclick = exportBackup;
  const tt = $('#themeToggle');
  const themeIcon = () => { tt.textContent = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? '☀️' : '🌙'; };
  themeIcon();
  tt.onclick = () => { const nx = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', nx); try { localStorage.setItem('vincere_theme', nx); } catch (e) {} themeIcon(); };
  window.addEventListener('hashchange', route);
  await loadDB();
  if (!location.hash) location.hash = '#/dashboard';
  route();
}
init();
})();
