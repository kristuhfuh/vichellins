"use server";

import { revalidatePath, updateTag } from "next/cache";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { done, fail, friendlyError, type ActionState } from "@/lib/admin/errors";
import { CATALOG_TAG } from "@/lib/catalog";
import { formString } from "@/lib/admin/util";
import { createClient } from "@/lib/supabase/server";

export async function adjustStock(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const id = formString(form, "variant_id");
  const reason = formString(form, "reason");
  const mode = formString(form, "mode");
  const amount = Number(formString(form, "amount"));
  if (!id) return fail("Missing variant.");
  if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) return fail("Enter a whole number greater than zero.");
  if (!["restock", "correction", "return"].includes(reason)) return fail("Choose a reason.");

  // "Remove" is only offered for corrections; restocks and returns always add.
  const delta = mode === "remove" && reason === "correction" ? -amount : amount;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_variant_id: id,
    p_delta: delta,
    p_reason: reason,
    p_note: formString(form, "note").slice(0, 200) || null,
  });
  if (error) {
    if (error.code === "23514") return fail("That would take stock below zero. Check the number and try again.");
    return fail(friendlyError(error));
  }
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  updateTag(CATALOG_TAG);
  return done(`Stock is now ${data}.`);
}
