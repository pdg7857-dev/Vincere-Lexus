import fs from 'fs';
import { abs } from './config.js';

const FILE = abs('data', 'listings.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { listings: [] };
  }
}

function write(db) {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export function allListings() {
  return read().listings;
}

export function getListing(id) {
  return read().listings.find((l) => l.id === id) || null;
}

export function saveListing(listing) {
  const db = read();
  const i = db.listings.findIndex((l) => l.id === listing.id);
  if (i >= 0) db.listings[i] = listing;
  else db.listings.push(listing);
  write(db);
  return listing;
}

export function removeListing(id) {
  const db = read();
  db.listings = db.listings.filter((l) => l.id !== id);
  write(db);
}

export function newId() {
  return 'lst_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
