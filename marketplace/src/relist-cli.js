// One-shot: relist everything that's due right now, then exit.
// Handy if you'd rather trigger relisting from cron / Task Scheduler than keep
// the app running. Example (every hour):  0 * * * *  cd /path/marketplace && npm run relist-now
import { dueForRelist, relist } from './service.js';
import { closeBrowser } from './browser.js';

async function main() {
  const due = dueForRelist();
  if (!due.length) {
    console.log('Nothing due for relist.');
  }
  for (const l of due) {
    try {
      console.log(`Relisting ${l.id} (${l.title})...`);
      await relist(l.id);
      console.log(`  done.`);
    } catch (e) {
      console.error(`  failed: ${e.message}`);
    }
  }
  await closeBrowser();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
