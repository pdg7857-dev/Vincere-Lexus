import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { loadConfig, abs, ensureDirs } from './config.js';
import { allListings, getListing, saveListing, removeListing, newId } from './store.js';
import { buildCaption } from './caption.js';
import { publish, relist, takeDown, titleFor } from './service.js';
import { startScheduler } from './scheduler.js';

ensureDirs();
const cfg = loadConfig();
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(abs('public')));
app.use('/uploads', express.static(abs('data', 'uploads')));

// Photos are stored per-listing so a relist can re-upload the same images.
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const id = req.params.id;
      const dir = abs('data', 'uploads', id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const safe = Date.now() + '-' + file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');
      cb(null, safe);
    },
  }),
});

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message });
});

// --- Listings CRUD ---------------------------------------------------------
app.get('/api/listings', (_req, res) => res.json({ listings: allListings(), config: { relistEveryDays: cfg.relistEveryDays } }));

app.post('/api/listings', wrap(async (req, res) => {
  const id = newId();
  const listing = {
    id,
    status: 'draft',
    autoRelist: req.body.autoRelist !== false,
    data: req.body.data || {},
    photoFiles: [],
    title: titleFor(req.body.data || {}),
    createdAt: new Date().toISOString(),
    history: [],
  };
  saveListing(listing);
  res.json(listing);
}));

app.put('/api/listings/:id', wrap(async (req, res) => {
  const listing = getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'not found' });
  if (req.body.data) listing.data = { ...listing.data, ...req.body.data };
  if (req.body.autoRelist !== undefined) listing.autoRelist = req.body.autoRelist;
  listing.title = titleFor(listing.data);
  saveListing(listing);
  res.json(listing);
}));

app.delete('/api/listings/:id', wrap(async (req, res) => {
  const dir = abs('data', 'uploads', req.params.id);
  fs.rmSync(dir, { recursive: true, force: true });
  removeListing(req.params.id);
  res.json({ ok: true });
}));

// --- Photos ----------------------------------------------------------------
app.post('/api/listings/:id/photos', upload.array('photos', 20), wrap(async (req, res) => {
  const listing = getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'not found' });
  const names = (req.files || []).map((f) => f.filename);
  listing.photoFiles = [...(listing.photoFiles || []), ...names];
  saveListing(listing);
  res.json(listing);
}));

app.delete('/api/listings/:id/photos/:file', wrap(async (req, res) => {
  const listing = getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'not found' });
  const file = path.basename(req.params.file);
  fs.rmSync(abs('data', 'uploads', listing.id, file), { force: true });
  listing.photoFiles = (listing.photoFiles || []).filter((f) => f !== file);
  saveListing(listing);
  res.json(listing);
}));

// --- Caption preview -------------------------------------------------------
app.post('/api/preview', (req, res) => res.json({ caption: buildCaption(req.body.data || {}) }));

// --- Actions (drive the browser) ------------------------------------------
app.post('/api/listings/:id/publish', wrap(async (req, res) => {
  res.json(await publish(req.params.id, { dryRun: !!req.body.dryRun }));
}));
app.post('/api/listings/:id/relist', wrap(async (req, res) => res.json(await relist(req.params.id))));
app.post('/api/listings/:id/takedown', wrap(async (req, res) => res.json(await takeDown(req.params.id))));

app.listen(cfg.port, () => {
  console.log(`\n  Marketplace auto-lister → http://localhost:${cfg.port}\n`);
  console.log('  First run? Log into Facebook once:  npm run login\n');
  startScheduler();
});
