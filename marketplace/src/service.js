import { loadConfig, abs } from './config.js';
import { getListing, saveListing, allListings } from './store.js';
import { postListing } from './poster.js';
import { deleteListing } from './deleter.js';
import { buildCaption } from './caption.js';

function titleFor(data) {
  return [data.year, data.make, data.model].filter(Boolean).join(' ').trim();
}

function photoAbs(listing) {
  return (listing.photoFiles || []).map((f) => abs('data', 'uploads', listing.id, f));
}

// Publish a stored listing for the first time (or re-publish a deleted one).
export async function publish(id, opts = {}) {
  const listing = getListing(id);
  if (!listing) throw new Error(`No listing ${id}`);

  const result = await postListing(listing.data, photoAbs(listing), opts);

  if (!opts.dryRun) {
    listing.status = 'active';
    listing.title = titleFor(listing.data);
    listing.url = result.url || listing.url || null;
    listing.publishedAt = result.publishedAt;
    listing.caption = result.caption;
    listing.history = listing.history || [];
    listing.history.push({ action: 'publish', at: result.publishedAt });
    saveListing(listing);
  }
  return result;
}

// Delete the live listing, then immediately publish a fresh copy ("relist").
// This refreshes the listing date without touching Messenger chats.
export async function relist(id) {
  const listing = getListing(id);
  if (!listing) throw new Error(`No listing ${id}`);

  if (listing.status === 'active' && listing.title) {
    try {
      const del = await deleteListing(listing.title);
      listing.history = listing.history || [];
      listing.history.push({ action: 'delete', at: del.deletedAt });
    } catch (e) {
      console.warn(`Relist ${id}: delete step failed (${e.message}); posting fresh copy anyway.`);
    }
  }

  const result = await postListing(listing.data, photoAbs(listing));
  listing.status = 'active';
  listing.title = titleFor(listing.data);
  listing.url = result.url || null;
  listing.publishedAt = result.publishedAt;
  listing.lastRelistedAt = result.publishedAt;
  listing.caption = result.caption;
  listing.history = listing.history || [];
  listing.history.push({ action: 'relist', at: result.publishedAt });
  saveListing(listing);
  return result;
}

// Take a live listing down without reposting.
export async function takeDown(id) {
  const listing = getListing(id);
  if (!listing) throw new Error(`No listing ${id}`);
  if (listing.status === 'active' && listing.title) {
    const del = await deleteListing(listing.title);
    listing.history = listing.history || [];
    listing.history.push({ action: 'delete', at: del.deletedAt });
  }
  listing.status = 'deleted';
  saveListing(listing);
  return { ok: true };
}

// Which active listings are now older than the relist window?
export function dueForRelist() {
  const cfg = loadConfig();
  const days = cfg.relistEveryDays || 10;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return allListings().filter(
    (l) => l.status === 'active' && l.autoRelist !== false && l.publishedAt && new Date(l.publishedAt).getTime() <= cutoff
  );
}

export { buildCaption, titleFor };
