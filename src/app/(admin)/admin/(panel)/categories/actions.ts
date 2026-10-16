"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CONTENT, requireStaff } from "@/lib/admin/auth";
import { done, fail, friendlyError, type ActionState } from "@/lib/admin/errors";
import { descendantIds, loadCategories, PRODUCT_KINDS } from "@/lib/admin/queries";
import { formString, slugify, specKey } from "@/lib/admin/util";
import { createClient } from "@/lib/supabase/server";

const SPEC_TYPES = ["text", "number", "select", "boolean"] as const;

function refresh() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function createCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);
  const name = formString(form, "name");
  if (!name) return fail("Enter a category name.");
  const slug = slugify(name);
  if (!slug) return fail("Use letters or numbers in the category name.");
  const kind = formString(form, "kind");

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    name,
    slug,
    parent_id: formString(form, "parent_id") || null,
    description: formString(form, "description"),
    kind: (PRODUCT_KINDS as readonly string[]).includes(kind) ? kind : "phone",
  });
  if (error) return fail(error.code === "23505" ? "A category with that name already exists." : friendlyError(error));
  refresh();
  return done(`Added ${name}. Open it to add spec fields.`);
}

export async function updateCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);
  const id = formString(form, "id");
  const name = formString(form, "name");
  const slug = slugify(formString(form, "slug") || name);
  if (!id || !name) return fail("Enter a category name.");
  if (!slug) return fail("The web address needs letters or numbers.");
  const kind = formString(form, "kind");
  const parentId = formString(form, "parent_id") || null;

  const supabase = await createClient();
  if (parentId) {
    const all = await loadCategories(supabase);
    if (descendantIds(all, id).has(parentId)) {
      return fail("A category can't sit inside itself or one of its own sub-categories.");
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
      parent_id: parentId,
      description: formString(form, "description"),
      kind: (PRODUCT_KINDS as readonly string[]).includes(kind) ? kind : "phone",
      is_active: form.get("is_active") === "on",
      sort_order: Number.parseInt(formString(form, "sort_order"), 10) || 0,
    })
    .eq("id", id);
  if (error) return fail(error.code === "23505" ? "Another category already uses that name or web address." : friendlyError(error));
  refresh();
  return done("Saved.");
}

export async function deleteCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);
  const id = formString(form, "id");
  if (!id) return fail("Missing category.");

  const supabase = await createClient();
  const [{ count: children }, { count: products }] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id),
  ]);
  if (children) return fail("Move or delete its sub-categories first.");
  if (products) return fail(`${products} product${products === 1 ? " is" : "s are"} in this category. Move them to another category first.`);

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fail(friendlyError(error));
  refresh();
  redirect("/admin/categories");
}

type SpecInput = {
  label: string;
  type: string;
  unit: string | null;
  options: string[] | null;
  filterable: boolean;
  required: boolean;
  sort_order: number;
};
type ParsedSpec = { error: string; value?: undefined } | { error?: undefined; value: SpecInput };

function parseSpec(form: FormData): ParsedSpec {
  const label = formString(form, "label");
  const type = formString(form, "type");
  if (!label) return { error: "Enter a field name." };
  if (!(SPEC_TYPES as readonly string[]).includes(type)) return { error: "Choose a field type." };

  const options =
    type === "select"
      ? [...new Set(formString(form, "options").split(/[\n,]/).map((o) => o.trim()).filter(Boolean))]
      : null;
  if (type === "select" && (!options || options.length < 2)) {
    return { error: "A choice list needs at least two options, separated by commas." };
  }

  return {
    value: {
      label,
      type,
      unit: type === "number" ? formString(form, "unit") || null : null,
      options,
      // The shop can only filter on choice lists and yes/no fields.
      filterable: (type === "select" || type === "boolean") && form.get("filterable") === "on",
      required: form.get("required") === "on",
      sort_order: Number.parseInt(formString(form, "sort_order"), 10) || 0,
    },
  };
}

export async function createSpec(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);
  const categoryId = formString(form, "category_id");
  const parsed = parseSpec(form);
  if (parsed.value === undefined) return fail(parsed.error);
  const key = specKey(parsed.value.label);

  const supabase = await createClient();
  const { error } = await supabase.from("spec_definitions").insert({ category_id: categoryId, key, ...parsed.value });
  if (error) return fail(error.code === "23505" ? "This category already has a field with that name." : friendlyError(error));
  refresh();
  revalidatePath(`/admin/categories/${categoryId}`);
  return done(`Added the "${parsed.value.label}" field.`);
}

export async function updateSpec(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);
  const id = formString(form, "id");
  const categoryId = formString(form, "category_id");
  const parsed = parseSpec(form);
  if (parsed.value === undefined) return fail(parsed.error);

  // The key is deliberately never changed: products store their values under it.
  const supabase = await createClient();
  const { error } = await supabase.from("spec_definitions").update(parsed.value).eq("id", id);
  if (error) return fail(friendlyError(error));
  refresh();
  revalidatePath(`/admin/categories/${categoryId}`);
  return done("Saved.");
}

export async function deleteSpec(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);
  const id = formString(form, "id");
  const categoryId = formString(form, "category_id");
  const supabase = await createClient();
  const { error } = await supabase.from("spec_definitions").delete().eq("id", id);
  if (error) return fail(friendlyError(error));
  refresh();
  revalidatePath(`/admin/categories/${categoryId}`);
  return done("Field removed.");
}
