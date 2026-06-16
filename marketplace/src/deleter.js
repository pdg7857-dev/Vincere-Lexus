import { loadConfig } from './config.js';
import { newPage, isLoggedIn } from './browser.js';
import { clickButton, shot, escapeRe } from './fb.js';

// Delete a listing from "Your listings". We match by the listing title text
// (e.g. "2019 Toyota Corolla"). Deleting a Marketplace listing does NOT delete
// or archive your Messenger conversations — those live with Messenger, so your
// chats survive a delete-and-relist.
export async function deleteListing(titleText) {
  const cfg = loadConfig();
  const page = await newPage();

  if (!(await isLoggedIn(page))) {
    throw new Error('Not logged into Facebook. Run `npm run login` first.');
  }

  await page.goto(cfg.facebook.yourListingsUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const title = String(titleText).trim();
  const titleRe = new RegExp(escapeRe(title), 'i');

  // Find the card row containing the title, then its "more options" (•••) button.
  const card = page
    .locator('div', { hasText: titleRe })
    .filter({ has: page.locator('[aria-label*="More"], [aria-label*="Actions"], div[role="button"]') })
    .last();

  let opened = false;
  try {
    const menuBtn = card
      .locator('[aria-label*="More"], [aria-label*="Actions for this listing"], div[role="button"]')
      .last();
    await menuBtn.click({ timeout: 6000 });
    opened = true;
  } catch {
    /* fall through to global menu search */
  }

  if (!opened) {
    // Fallback: click any "More" button near the matched title.
    await clickButton(page, 'More');
  }
  await page.waitForTimeout(1000);

  // Click "Delete listing" in the popup menu, then confirm.
  const deleteItem = page
    .getByRole('menuitem', { name: /delete/i })
    .or(page.locator('[role="menuitem"]:has-text("Delete")'))
    .or(page.locator('div[role="button"]:has-text("Delete listing")'))
    .first();

  try {
    await deleteItem.click({ timeout: 6000 });
  } catch {
    await clickButton(page, 'Delete listing');
  }
  await page.waitForTimeout(1200);

  // Confirmation dialog.
  await clickButton(page, 'Delete');
  await page.waitForTimeout(3000);

  await shot(page, 'after-delete');
  return { deletedAt: new Date().toISOString(), title };
}
