// Refresh dealer inventory from Northwest Lexus, then import into the CRM and
// recompute matches. For an OS-level cron on your Mac, or run by hand.
//
//   npm run sync:inventory              # scrape the web, then import
//   npm run sync:inventory -- --no-scrape   # just re-import the snapshot on disk
import "dotenv/config";
import { syncDealer } from "../src/lib/dealerSync";

const noScrape = process.argv.includes("--no-scrape");

syncDealer({ scrape: !noScrape })
  .then((r) => {
    if (r.scrapeMessage) console.log(`scrape: ${r.scraped ? "ok" : "FAILED"} — ${r.scrapeMessage}`);
    if (r.error && !r.imported) {
      console.error(`sync failed: ${r.error}`);
      process.exit(1);
    }
    if (r.imported) {
      const i = r.imported;
      console.log(
        `✓ imported ${i.created} new, ${i.updated} updated, ${i.skipped} skipped ` +
          `(${i.total} units · dealer: ${i.dealer ?? "?"} · scraped: ${i.scrapedAt ?? "?"})`,
      );
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
