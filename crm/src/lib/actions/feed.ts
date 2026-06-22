"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { runFeed } from "@/lib/inventoryFeed";

/** Manually run the inventory feed from Settings ("Run import now"). Creates the
 *  drop folder on first run so the user can see where to put files. */
export async function runFeedNow() {
  await requireUser();
  await runFeed({ create: true });
  revalidatePath("/settings");
  revalidatePath("/inventory");
  revalidatePath("/matches");
  revalidatePath("/dashboard");
}
