"use server";

import { revalidatePath } from "next/cache";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { done, fail, friendlyError, type ActionState } from "@/lib/admin/errors";
import { formString, parseNaira } from "@/lib/admin/util";
import { createClient } from "@/lib/supabase/server";

function parse(form: FormData) {
  const name = formString(form, "name");
  const fee = parseNaira(form.get("fee"));
  if (!name) return { error: "Enter a name for the area." } as const;
  if (fee === null) return { error: "Enter the delivery fee in naira (0 for free delivery)." } as const;
  return {
    value: {
      name,
      fee,
      eta: formString(form, "eta"),
      sort_order: Number.parseInt(formString(form, "sort_order"), 10) || 0,
    },
  } as const;
}

export async function createZone(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const parsed = parse(form);
  if ("error" in parsed) return fail(parsed.error ?? "Check the form.");
  const supabase = await createClient();
  const { error } = await supabase.from("delivery_zones").insert(parsed.value);
  if (error) return fail(friendlyError(error));
  revalidatePath("/admin/delivery");
  return done(`Added ${parsed.value.name}.`);
}

export async function updateZone(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const id = formString(form, "id");
  const parsed = parse(form);
  if ("error" in parsed) return fail(parsed.error ?? "Check the form.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("delivery_zones")
    .update({ ...parsed.value, is_active: form.get("is_active") === "on" })
    .eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/admin/delivery");
  return done("Saved.");
}

export async function deleteZone(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const supabase = await createClient();
  const { error } = await supabase.from("delivery_zones").delete().eq("id", formString(form, "id"));
  if (error) return fail(friendlyError(error));
  revalidatePath("/admin/delivery");
  return done("Area deleted.");
}
