import { chromium } from 'playwright';
import { loadConfig, abs } from './config.js';

// A single shared persistent browser context. The Facebook session (cookies,
// local storage) lives in the on-disk user-data dir, so you log in ONCE by hand
// and stay logged in across runs — exactly like a normal browser profile.
let context = null;

export async function getContext() {
  if (context) return context;
  const cfg = loadConfig();
  context = await chromium.launchPersistentContext(abs(cfg.browser.userDataDir), {
    headless: cfg.browser.headless,
    slowMo: cfg.browser.slowMo || 0,
    locale: cfg.browser.locale || 'en-US',
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  return context;
}

export async function newPage() {
  const ctx = await getContext();
  const pages = ctx.pages();
  return pages.length ? pages[0] : await ctx.newPage();
}

export async function closeBrowser() {
  if (context) {
    await context.close();
    context = null;
  }
}

// Are we logged into Facebook? Checks for the logged-out login form.
export async function isLoggedIn(page) {
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const loginForm = await page.$('input[name="email"], form[action*="login"]');
  return !loginForm;
}
