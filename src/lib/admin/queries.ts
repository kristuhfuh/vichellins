import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string;
  kind: string;
  sort_order: number;
  is_active: boolean;
};

export type SpecDefRow = {
  id: string;
  category_id: string;
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  unit: string | null;
  options: string[] | null;
  filterable: boolean;
  required: boolean;
  sort_order: number;
};

export type BrandRow = { id: string; name: string; slug: string };

export const PRODUCT_KINDS = [
  "phone",
  "laptop",
  "headphones",
  "earbuds",
  "speaker",
  "watch",
  "camera",
  "powerbank",
  "vacuum",
  "plug",
  "charger",
] as const;

export async function loadCategories(supabase: SupabaseClient): Promise<CategoryRow[]> {
  const { data } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, description, kind, sort_order, is_active")
    .order("sort_order")
    .order("name");
  return (data ?? []) as CategoryRow[];
}

export async function loadBrands(supabase: SupabaseClient): Promise<BrandRow[]> {
  const { data } = await supabase.from("brands").select("id, name, slug").order("name");
  return (data ?? []) as BrandRow[];
}

export async function loadSpecDefs(supabase: SupabaseClient): Promise<SpecDefRow[]> {
  const { data } = await supabase
    .from("spec_definitions")
    .select("id, category_id, key, label, type, unit, options, filterable, required, sort_order")
    .order("sort_order")
    .order("label");
  return (data ?? []) as SpecDefRow[];
}

/** Categories in tree order, each with its depth, for indented dropdowns and the category list. */
export function flattenTree(categories: CategoryRow[]): (CategoryRow & { depth: number })[] {
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const c of categories) {
    const list = byParent.get(c.parent_id) ?? [];
    list.push(c);
    byParent.set(c.parent_id, list);
  }
  const out: (CategoryRow & { depth: number })[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const c of byParent.get(parent) ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function descendantIds(categories: CategoryRow[], id: string): Set<string> {
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Spec fields for a category including those inherited from its parents (child overrides parent by key). */
export function inheritedSpecs(categories: CategoryRow[], defs: SpecDefRow[], categoryId: string): SpecDefRow[] {
  const chain: string[] = [];
  let current = categories.find((c) => c.id === categoryId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current.id);
    current = current.parent_id ? categories.find((c) => c.id === current!.parent_id) : undefined;
  }
  const byKey = new Map<string, SpecDefRow>();
  for (const id of chain) {
    for (const def of defs.filter((d) => d.category_id === id)) byKey.set(def.key, def);
  }
  return [...byKey.values()].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
}

export type OptionOrder = Map<string, string[]>;

/** Option names per product in display order, used to label variants like "256GB / Black". */
export async function loadOptionOrder(supabase: SupabaseClient, productIds: string[]): Promise<OptionOrder> {
  const order: OptionOrder = new Map();
  if (productIds.length === 0) return order;
  const { data } = await supabase
    .from("product_options")
    .select("product_id, name, position")
    .in("product_id", productIds)
    .order("position");
  for (const o of data ?? []) {
    const list = order.get(o.product_id) ?? [];
    list.push(o.name);
    order.set(o.product_id, list);
  }
  return order;
}

export function variantLabel(optionValues: Record<string, string>, names: string[] | undefined): string {
  const ordered = (names ?? Object.keys(optionValues)).map((n) => optionValues[n]).filter(Boolean);
  return ordered.join(" / ");
}
