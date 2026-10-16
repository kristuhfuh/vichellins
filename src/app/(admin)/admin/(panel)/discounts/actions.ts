"use server";

import { revalidatePath } from "next/cache";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { done, fail, friendlyError, type ActionState } from "@/lib/admin/errors";
import { formString, parseNaira } from "@/lib/admin/util";
import { createClient } from "@/lib/supabase/server";

// Lagos is UTC+1 all year, so a calendar date maps to a fixed offset.
const startOfDay = (d: string) => `${d}T00:00:00+01:00`;
const endOfDay = (d: string) => `${d}T23:59:59+01:00`;
const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

function parse(form: FormData) {
  const kind = formString(form, "kind");
  const value = Number.parseInt(formString(form, "value"), 10);
  const min = parseNaira(form.get("min_subtotal")) ?? 0;
  const maxRaw = formString(form, "max_uses");
  const maxUses = maxRaw === "" ? null : Number.parseInt(maxRaw, 10);
  const from = formString(form, "starts");
  const to = formString(form, "ends");

  if (kind !== "percent" && kind !== "fixed") return { error: "Choose percent or fixed amount." } as const;
  if (!Number.isInteger(value) || value <= 0) return { error: "Enter a discount greater than zero." } as const;
  if (kind === "percent" && value > 100) return { error: "A percentage discount can't be more than 100." } as const;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) return { error: "Uses must be a whole number above zero, or blank for unlimited." } as const;
  if ((from && !isDate(from)) || (to && !isDate(to))) return { error: "Enter valid dates." } as const;
  if (from && to && from > to) return { error: "The end date can't be before the start date." } as const;

  return {
    value: {
      kind,
      value,
      min_subtotal: min,
      max_uses: maxUses,
      starts_at: from ? startOfDay(from) : null,
      ends_at: to ? endOfDay(to) : null,
    },
  } as const;
}

export async function createDiscount(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const code = formString(form, "code").toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return fail("The code needs 3 to 24 letters, numbers, hyphens or underscores, with no spaces.");
  const parsed = parse(form);
  if ("error" in parsed) return fail(parsed.error ?? "Check the form.");

  const supabase = await createClient();
  const { error } = await supabase.from("discount_codes").insert({ code, ...parsed.value });
  if (error) return fail(error.code === "23505" ? "That code already exists." : friendlyError(error));
  revalidatePath("/admin/discounts");
  return done(`Created ${code}.`);
}

export async function updateDiscount(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const id = formString(form, "id");
  const parsed = parse(form);
  if ("error" in parsed) return fail(parsed.error ?? "Check the form.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("discount_codes")
    .update({ ...parsed.value, is_active: form.get("is_active") === "on" })
    .eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/admin/discounts");
  return done("Saved.");
}

export async function deleteDiscount(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const supabase = await createClient();
  const { error } = await supabase.from("discount_codes").delete().eq("id", formString(form, "id"));
  if (error) return fail(friendlyError(error));
  revalidatePath("/admin/discounts");
  return done("Code deleted.");
}
