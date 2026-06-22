"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { str, type FormState } from "@/lib/forms";
import { importInventoryCsv } from "@/lib/inventoryImport";
import { matchVehicleSafe } from "@/lib/matching";

export async function importVehiclesCsv(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireUser();

  const file = fd.get("file");
  let text = "";
  let sourceName = "pasted CSV";
  if (file instanceof File && file.size > 0) {
    text = await file.text();
    sourceName = file.name || "upload.csv";
  } else {
    text = str(fd, "csv") ?? "";
  }
  if (!text.trim()) return { error: "Choose a CSV file or paste CSV text." };

  const r = await importInventoryCsv(text);
  if (r.parseError && r.total === 0)
    return { error: `Couldn't parse CSV: ${r.parseError}` };

  // Record the run (shows in Settings alongside auto-feed imports) and recompute
  // matches for every vehicle the import touched.
  await prisma.feedRun.create({
    data: {
      source: sourceName,
      status: "OK",
      total: r.total,
      created: r.created,
      updated: r.updated,
      skipped: r.skipped,
    },
  });
  for (const id of r.affectedIds) await matchVehicleSafe(id);

  revalidatePath("/inventory");
  revalidatePath("/matches");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: `Imported ${r.created} new, updated ${r.updated}${r.skipped ? `, skipped ${r.skipped} (missing make/model)` : ""}.`,
  };
}
