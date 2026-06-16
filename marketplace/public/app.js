const FIELDS = ['year', 'make', 'model', 'trim', 'price', 'mileage', 'bodyStyle',
  'fuelType', 'transmission', 'drivetrain', 'condition', 'titleStatus',
  'exteriorColor', 'interiorColor', 'location', 'features', 'description'];
const $ = (id) => document.getElementById(id);
let relistDays = 10;

function readForm() {
  const data = {};
  for (const f of FIELDS) data[f] = $(f).value;
  data.negotiable = $('negotiable').checked;
  return data;
}
function writeForm(d = {}) {
  for (const f of FIELDS) $(f).value = d[f] || '';
  $('negotiable').checked = d.negotiable !== false;
}
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3500);
}
async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
}

// --- live caption preview (debounced) ---
let pvT;
async function preview() {
  clearTimeout(pvT);
  pvT = setTimeout(async () => {
    const { caption } = await api('/api/preview', { method: 'POST', body: JSON.stringify({ data: readForm() }) });
    $('preview').textContent = caption;
  }, 250);
}
document.querySelectorAll('input, select, textarea').forEach((el) => el.addEventListener('input', preview));

// --- save (create or update) ---
async function save() {
  const id = $('listingId').value;
  const data = readForm();
  const autoRelist = $('autoRelist').checked;
  let listing;
  if (id) {
    listing = await api('/api/listings/' + id, { method: 'PUT', body: JSON.stringify({ data, autoRelist }) });
  } else {
    listing = await api('/api/listings', { method: 'POST', body: JSON.stringify({ data, autoRelist }) });
    $('listingId').value = listing.id;
  }
  // upload any newly selected photos
  const files = $('photoInput').files;
  if (files && files.length) {
    const fd = new FormData();
    for (const f of files) fd.append('photos', f);
    listing = await api('/api/listings/' + listing.id + '/photos', { method: 'POST', body: fd, headers: {} });
    $('photoInput').value = '';
  }
  renderPhotos(listing);
  await load();
  toast('Saved ✓');
  return listing;
}

function renderPhotos(listing) {
  const box = $('photoList'); box.innerHTML = '';
  for (const f of listing.photoFiles || []) {
    const d = document.createElement('div'); d.className = 'thumb';
    d.innerHTML = `<img src="/uploads/${listing.id}/${encodeURIComponent(f)}" />
      <button class="x" title="remove">×</button>`;
    d.querySelector('.x').onclick = async () => {
      const upd = await api(`/api/listings/${listing.id}/photos/${encodeURIComponent(f)}`, { method: 'DELETE' });
      renderPhotos(upd);
    };
    box.appendChild(d);
  }
}

function loadIntoForm(l) {
  $('listingId').value = l.id;
  writeForm(l.data);
  $('autoRelist').checked = l.autoRelist !== false;
  renderPhotos(l);
  preview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function newListing() {
  $('listingId').value = '';
  writeForm({});
  $('autoRelist').checked = true;
  $('photoList').innerHTML = '';
  preview();
}

function ageDays(iso) { return iso ? Math.floor((Date.now() - new Date(iso)) / 86400000) : null; }

async function load() {
  const { listings, config } = await api('/api/listings');
  relistDays = config.relistEveryDays; $('relistDays').textContent = relistDays;
  const box = $('listings'); box.innerHTML = '';
  if (!listings.length) { box.innerHTML = '<p class="meta">No listings yet.</p>'; return; }
  for (const l of listings.slice().reverse()) {
    const age = ageDays(l.publishedAt);
    const due = l.status === 'active' && age != null && age >= relistDays;
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `
      <div class="row">
        <span class="title">${l.title || '(untitled)'} ${l.data?.price ? '· $' + l.data.price : ''}</span>
        <span class="badge ${l.status}">${l.status}</span>
      </div>
      <div class="meta">
        ${l.status === 'active' && age != null
          ? `Live ${age} day(s) · <span class="${due ? 'due' : ''}">relist at ${relistDays}d${due ? ' — DUE' : ''}</span>`
          : 'Not posted yet'}
        ${l.autoRelist === false ? ' · auto-relist OFF' : ''}
        ${l.photoFiles?.length ? ` · ${l.photoFiles.length} photo(s)` : ''}
      </div>
      <div class="btns">
        <button data-a="edit">✏️ Edit</button>
        <button data-a="publish">🚀 Publish</button>
        <button data-a="relist">🔁 Relist now</button>
        <button data-a="takedown">⏬ Take down</button>
        <button data-a="delete">🗑 Remove</button>
      </div>`;
    card.querySelector('[data-a=edit]').onclick = () => loadIntoForm(l);
    card.querySelector('[data-a=publish]').onclick = () => act(l.id, 'publish', 'Publishing… watch the browser window.');
    card.querySelector('[data-a=relist]').onclick = () => act(l.id, 'relist', 'Relisting (delete + repost)…');
    card.querySelector('[data-a=takedown]').onclick = () => act(l.id, 'takedown', 'Taking listing down…');
    card.querySelector('[data-a=delete]').onclick = async () => {
      if (!confirm('Remove this listing from the app? (Does not delete it from Facebook.)')) return;
      await api('/api/listings/' + l.id, { method: 'DELETE' }); await load(); toast('Removed');
    };
    box.appendChild(card);
  }
}

async function act(id, action, msg) {
  toast(msg);
  try {
    const r = await api(`/api/listings/${id}/${action}`, { method: 'POST', body: JSON.stringify({}) });
    toast(r.dryRun ? 'Form filled (not published) — check the browser.' : (action + ' done ✓'));
  } catch (e) {
    toast('Error: ' + e.message);
  }
  await load();
}

$('saveBtn').onclick = save;
$('publishBtn').onclick = async () => { const l = await save(); act(l.id, 'publish', 'Publishing… a browser window will drive Facebook.'); };
$('dryBtn').onclick = async () => {
  const l = await save();
  toast('Filling form (no publish)…');
  await api(`/api/listings/${l.id}/publish`, { method: 'POST', body: JSON.stringify({ dryRun: true }) });
  toast('Form filled — review it in the browser window.');
};
$('photoInput').onchange = () => { if ($('listingId').value) save(); };

load();
preview();
