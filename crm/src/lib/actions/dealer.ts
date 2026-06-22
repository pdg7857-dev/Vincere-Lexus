"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { syncDealer } from "@/lib/dealerSync";

/** Button: scrape Northwest Lexus live, then import + recompute matches.
 *  Takes a few minutes and only works from a normal network (the dealer site is
 *  behind Cloudflare). On failure the existing snapshot is left untouched. */
export async function syncDealerNow() {
  await requireUser();
  await syncDealer({ scrape: true });
  revalidatePath("/inventory");
  revalidatePath("/matches");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

/** Button: re-import the snapshot already on disk (no network). */
export async function reimportSnapshotNow() {
  await requireUser();
  await syncDealer({ scrape: false });
  revalidatePath("/inventory");
  revalidatePath("/matches");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}
