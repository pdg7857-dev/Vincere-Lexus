// One-off bulk import of the bundled dealer inventory snapshot
// (../data/inventory.json, shared with the showroom tool) into the Vehicle
// table. Idempotent: upserts by VIN. Run with `npm run import:inventory`.
import "dotenv/config";
import { importSnapshot } from "../src/lib/inventorySnapshot";

importSnapshot()
  .then((r) => {
    if (r.parseError) {
      console.error(r.parseError);
      process.exit(1);
    }
    console.log(
      `✓ imported ${r.created} new, updated ${r.updated}, skipped ${r.skipped} (from ${r.total} units)`,
    );
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
