import fs from 'fs';
import { loadConfig } from './config.js';
import { newPage, isLoggedIn } from './browser.js';
import { fillField, selectOption, clickButton, shot } from './fb.js';
import { buildCaption } from './caption.js';

// Map our generic body-style names onto the closest Facebook option labels.
const BODY_STYLE_MAP = {
  Sedan: 'Sedan', SUV: 'SUV', Coupe: 'Coupe', Truck: 'Truck',
  Hatchback: 'Hatchback', Van: 'Van/Minivan', Convertible: 'Convertible',
  Wagon: 'Wagon', Other: 'Other',
};

// Post one listing to Facebook Marketplace by driving the real create form.
// `data` is the saved form record; `photoPaths` are absolute image paths.
// If opts.dryRun is true we fill everything but stop before publishing.
export async function postListing(data, photoPaths, opts = {}) {
  const cfg = loadConfig();
  const L = cfg.facebook.labels;
  const page = await newPage();

  if (!(await isLoggedIn(page))) {
    throw new Error('Not logged into Facebook. Run `npm run login` first.');
  }

  await page.goto(cfg.facebook.createVehicleUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // 1) Photos — Marketplace exposes a hidden <input type=file accept=image>.
  const existing = (photoPaths || []).filter((p) => fs.existsSync(p));
  if (existing.length) {
    try {
      const input = page.locator('input[type="file"][accept*="image"]').first();
      await input.setInputFiles(existing.slice(0, 20)); // FB caps around 20
      await page.waitForTimeout(2500);
    } catch (e) {
      console.warn('  · photo upload failed:', e.message);
    }
  }

  // 2) Structured fields. selectOption / fillField are best-effort and warn
  //    (not throw) on a miss so one renamed field can't sink the whole post.
  await selectOption(page, L.vehicleType, data.vehicleType || 'Car/Truck');
  await selectOption(page, L.year, data.year);
  await fillField(page, L.make, data.make);
  await fillField(page, L.model, data.model);
  await fillField(page, L.mileage, data.mileage);
  await fillField(page, L.price, data.price);
  await selectOption(page, L.bodyStyle, BODY_STYLE_MAP[data.bodyStyle] || data.bodyStyle);
  await selectOption(page, L.exteriorColor, data.exteriorColor);
  await selectOption(page, L.interiorColor, data.interiorColor);
  await selectOption(page, L.fuelType, data.fuelType);
  await selectOption(page, L.transmission, data.transmission);
  await selectOption(page, L.condition, data.condition);

  // 3) Description — the locked-format caption goes here.
  const caption = buildCaption(data);
  await fillField(page, L.description, caption);

  await page.waitForTimeout(1000);
  await shot(page, 'before-publish');

  if (opts.dryRun) {
    return { dryRun: true, caption, url: page.url(), note: 'Filled form but did not publish.' };
  }

  // 4) Publish — often a "Next" step (review) then "Publish".
  await clickButton(page, L.next);
  await page.waitForTimeout(1500);
  const published = await clickButton(page, L.publish);
  if (!published) {
    // Some flows publish straight from the first screen.
    await clickButton(page, L.publish);
  }
  await page.waitForTimeout(5000);

  const url = page.url();
  await shot(page, 'after-publish');
  return { dryRun: false, caption, url, publishedAt: new Date().toISOString() };
}
