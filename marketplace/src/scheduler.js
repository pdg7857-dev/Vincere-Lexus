import { loadConfig } from './config.js';
import { dueForRelist, relist } from './service.js';

let timer = null;
let running = false;

// Periodically check for listings past the relist window and relist them
// one at a time (serial — a single browser profile can't post in parallel).
export function startScheduler() {
  const cfg = loadConfig();
  const everyMs = Math.max(5, cfg.schedulerCheckMinutes || 60) * 60 * 1000;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const due = dueForRelist();
      if (due.length) {
        console.log(`[scheduler] ${due.length} listing(s) due for relist (>${cfg.relistEveryDays}d).`);
      }
      for (const l of due) {
        try {
          console.log(`[scheduler] relisting ${l.id} (${l.title})...`);
          await relist(l.id);
          console.log(`[scheduler] relisted ${l.id}.`);
        } catch (e) {
          console.error(`[scheduler] relist ${l.id} failed:`, e.message);
        }
      }
    } finally {
      running = false;
    }
  };

  tick(); // run once at startup
  timer = setInterval(tick, everyMs);
  console.log(
    `[scheduler] running every ${cfg.schedulerCheckMinutes} min; relist window = ${cfg.relistEveryDays} days.`
  );
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
