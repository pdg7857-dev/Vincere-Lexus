// Shared, defensive helpers for driving Facebook's UI.
//
// IMPORTANT: Facebook's Marketplace markup changes often and has no stable IDs.
// Every helper here tries several strategies and is wrapped so a single missing
// field doesn't silently corrupt a listing. If FB changes something, the labels
// in config.json are the first thing to adjust, then these helpers.
import { abs } from './config.js';

export async function shot(page, name) {
  try {
    const file = abs('data', 'screenshots', `${name}-${Date.now()}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } catch {
    return null;
  }
}

// Type into a text field identified by its visible label / placeholder / aria-label.
export async function fillField(page, label, value) {
  if (value == null || value === '') return false;
  const v = String(value);

  const candidates = [
    page.getByLabel(label, { exact: false }),
    page.getByPlaceholder(label, { exact: false }),
    page.locator(`[aria-label="${label}"]`),
    page.locator(`input[aria-label*="${label}"], textarea[aria-label*="${label}"]`),
  ];

  for (const c of candidates) {
    try {
      const el = c.first();
      if (await el.count()) {
        await el.click({ timeout: 4000 });
        await el.fill('');
        await el.fill(v);
        return true;
      }
    } catch {
      /* try next strategy */
    }
  }
  console.warn(`  · could not find text field "${label}"`);
  return false;
}

// Open a Facebook dropdown/combobox by its label and pick an option by text.
export async function selectOption(page, label, value) {
  if (value == null || value === '') return false;
  const v = String(value);

  const openers = [
    page.getByLabel(label, { exact: false }),
    page.locator(`[aria-label="${label}"]`),
    page.getByRole('combobox', { name: new RegExp(label, 'i') }),
    page.locator(`label:has-text("${label}")`),
  ];

  for (const opener of openers) {
    try {
      const el = opener.first();
      if (!(await el.count())) continue;
      await el.click({ timeout: 4000 });
      await page.waitForTimeout(500);

      // Options render as role=option in a popup listbox.
      const exact = page.getByRole('option', { name: v, exact: true }).first();
      if (await exact.count()) {
        await exact.click();
        return true;
      }
      const loose = page.getByRole('option', { name: new RegExp(escapeRe(v), 'i') }).first();
      if (await loose.count()) {
        await loose.click();
        return true;
      }
      // Some are native <select> elements.
      try {
        await el.selectOption({ label: v });
        return true;
      } catch {
        /* not a native select */
      }
    } catch {
      /* try next opener */
    }
  }
  console.warn(`  · could not set dropdown "${label}" = "${v}"`);
  return false;
}

// Click a button by visible text (Next / Publish / Delete / Confirm ...).
export async function clickButton(page, text) {
  const tries = [
    page.getByRole('button', { name: new RegExp(`^${escapeRe(text)}$`, 'i') }),
    page.getByRole('button', { name: new RegExp(escapeRe(text), 'i') }),
    page.locator(`div[role="button"]:has-text("${text}")`),
    page.locator(`[aria-label="${text}"]`),
  ];
  for (const t of tries) {
    try {
      const el = t.first();
      if (await el.count()) {
        await el.click({ timeout: 6000 });
        return true;
      }
    } catch {
      /* next */
    }
  }
  console.warn(`  · could not click button "${text}"`);
  return false;
}

export function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
