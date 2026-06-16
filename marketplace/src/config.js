import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadConfig() {
  const raw = fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8');
  return JSON.parse(raw);
}

export function loadTemplate() {
  return fs.readFileSync(path.join(ROOT, 'templates', 'caption.txt'), 'utf8');
}

export function abs(...p) {
  return path.join(ROOT, ...p);
}

// Ensure runtime dirs exist.
export function ensureDirs() {
  for (const d of ['data', 'data/uploads', 'data/screenshots']) {
    fs.mkdirSync(abs(d), { recursive: true });
  }
}
