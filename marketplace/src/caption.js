import { loadTemplate, loadConfig } from './config.js';

// Turn the form data into the locked-format caption by filling the template blanks.
export function buildCaption(data) {
  const cfg = loadConfig();
  const tpl = loadTemplate();

  const price = data.price != null && data.price !== ''
    ? Number(data.price).toLocaleString('en-US')
    : '____';
  const mileage = data.mileage != null && data.mileage !== ''
    ? Number(data.mileage).toLocaleString('en-US')
    : '____';

  const negotiable = data.negotiable ?? cfg.defaults?.negotiable ?? true;

  // Features: accept newline- or comma-separated, render as a bulleted list.
  const features = String(data.features || '')
    .split(/[\n,]+/)
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => `• ${f}`)
    .join('\n') || '• (none listed)';

  const fields = {
    year: data.year || '____',
    make: data.make || '____',
    model: data.model || '____',
    trim: data.trim || '',
    price,
    mileage,
    fuel_type: data.fuelType || '—',
    transmission: data.transmission || '—',
    drivetrain: data.drivetrain || '—',
    exterior_color: data.exteriorColor || '—',
    interior_color: data.interiorColor || '—',
    title_status: data.titleStatus || 'Clean',
    condition: data.condition || 'Used',
    features,
    description: data.description || '—',
    location: data.location || cfg.defaults?.location || '—',
    negotiable_tag: negotiable ? '  (OBO)' : '  (Firm)',
    listed_date: new Date().toLocaleDateString('en-CA'),
  };

  let out = tpl;
  for (const [k, v] of Object.entries(fields)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  // Collapse the double space that appears when {trim} is empty.
  return out.replace(/ {2,}/g, ' ').replace(/ +\n/g, '\n').trim() + '\n';
}
