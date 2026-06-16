// One-time (and as-needed) interactive login.
// Opens a real Chromium window using the persistent profile. Log into Facebook
// by hand — including any 2FA — then come back to the terminal and press Enter.
// The session is saved to the profile and reused by every other command.
import readline from 'readline';
import { getContext, newPage, isLoggedIn, closeBrowser } from './browser.js';

async function main() {
  await getContext();
  const page = await newPage();
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });

  console.log('\n=== Facebook login ===');
  console.log('A browser window is open. Log into YOUR Facebook account there');
  console.log('(handle any 2FA / checkpoints). Leave it on the Facebook home feed.');
  console.log('When done, come back here and press Enter.\n');

  await new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Press Enter once you are logged in... ', () => {
      rl.close();
      resolve();
    });
  });

  const ok = await isLoggedIn(page);
  console.log(ok ? '\n✅ Logged in. Session saved.' : '\n⚠️  Still see a login form — try again.');
  await closeBrowser();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
