"use server";

import { revalidatePath } from "next/cache";
import { CONTENT, requireStaff } from "@/lib/admin/auth";
import { done, fail, friendlyError, type ActionState } from "@/lib/admin/errors";
import { formString, slugify } from "@/lib/admin/util";
import { createClient } from "@/lib/supabase/server";

export async function createBrand(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);
  const name = formString(form, "name");
  if (!name) return fail("Enter a brand name.");
  const slug = slugify(name);
  if (!slug) return fail("Use letters or numbers in the brand name.");

  const supabase = await createClient();
  const { error } = await supabase.from("brands").insert({ name, slug });
  if (error) return fail(error.code === "23505" ? "A brand with that name already exists." : friendlyError(error));
  revalidatePath("/admin/brands");
  return done(`Added ${name}.`);
}

export async function updateBrand(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);
  const id = formString(form, "id");
  const name = formString(form, "name");
  if (!id || !name) return fail("Enter a brand name.");

  const supabase = await createClient();
  const { error } = await supabase.from("brands").update({ name, slug: slugify(name) }).eq("id", id);
  if (error) return fail(error.code === "23505" ? "A brand with that name already exists." : friendlyError(error));
  revalidatePath("/admin/brands");
  return done("Saved.");
}

export async function deleteBrand(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);
  const id = formString(form, "id");
  if (!id) return fail("Missing brand.");

  const supabase = await createClient();
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/admin/brands");
  return done("Brand deleted. Its products now have no brand.");
}
