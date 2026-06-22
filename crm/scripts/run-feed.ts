// One-shot inventory feed run: import any CSVs sitting in the watched folder,
// then exit. Handy for testing or an OS-level cron. `npm run feed`.
import "dotenv/config";
import { runFeed, feedDir } from "../src/lib/inventoryFeed";

runFeed({ create: true })
  .then((r) => {
    if (!r.files.length) {
      console.log(`No new CSVs in ${feedDir()}. Drop *.csv files there and re-run.`);
      return;
    }
    for (const f of r.files) {
      console.log(
        `${f.status === "OK" ? "✓" : "✗"} ${f.file} — ${f.created} new, ${f.updated} updated, ${f.skipped} skipped` +
          (f.message ? ` (${f.message})` : ""),
      );
    }
  })
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
