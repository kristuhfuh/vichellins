import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  brands as sampleBrands,
  categories as sampleCategories,
  products as sampleProducts,
  specDefinitions as sampleSpecDefs,
} from "./sample-data";
import { supabaseConfigured } from "./supabase/env";
import type {
  AuthenticityStatus,
  Brand,
  Category,
  Condition,
  Product,
  ProductImage,
  ProductKind,
  ProductOption,
  ShopQuery,
  SpecDefinition,
  SpecValue,
  Variant,
  WarrantyType,
} from "./types";

/**
 * Read access to the catalogue. Every page goes through these functions so
 * the schema stays behind this file.
 *
 * All reads are async: they load the published catalogue from Supabase and
 * fall back to the sample data when Supabase isn't configured or is reachable
 * but empty (so `npm run dev` still works out of the box). Admin writes call
 * revalidateTag(CATALOG_TAG) to drop this snapshot.
 */

export const PAGE_SIZE = 9;
export const CATALOG_TAG = "catalog";

type Catalog = {
  categories: Category[];
  brands: Brand[];
  specDefinitions: SpecDefinition[];
  products: Product[];
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  brand_id: string | null;
  category_id: string;
  description: string | null;
  highlights: string[] | null;
  featured: boolean;
  condition: Condition;
  warranty_months: number;
  warranty_type: WarrantyType;
  warranty_notes: string | null;
  authenticity_status: AuthenticityStatus;
  authenticity_notes: string | null;
  specs: Record<string, SpecValue> | null;
  kind: string | null;
  tone: string | null;
  popularity: number;
  created_at: string;
  product_options: { name: string; position: number }[] | null;
  product_images: { url: string; alt: string | null; sort_order: number }[] | null;
  variants: {
    id: string;
    sku: string;
    option_values: Record<string, string> | null;
    price: number;
    compare_at_price: number | null;
    stock: number;
    is_active: boolean;
  }[] | null;
};

const sampleCatalog: Catalog = {
  categories: sampleCategories,
  brands: sampleBrands,
  specDefinitions: sampleSpecDefs,
  products: sampleProducts,
};

function mapProduct(row: ProductRow, categoryKind: ProductKind | undefined): Product {
  const options: ProductOption[] = (row.product_options ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((o) => {
      const values = new Set<string>();
      for (const v of row.variants ?? []) {
        const value = v.option_values?.[o.name];
        if (value) values.add(value);
      }
      return { name: o.name, values: [...values] };
    });

  const variants: Variant[] = (row.variants ?? [])
    .filter((v) => v.is_active)
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      optionValues: v.option_values ?? {},
      price: v.price,
      compareAtPrice: v.compare_at_price ?? undefined,
      stock: v.stock,
    }));

  const images: ProductImage[] = (row.product_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ url: i.url, alt: i.alt ?? "" }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandId: row.brand_id ?? "",
    categoryId: row.category_id,
    description: row.description ?? "",
    highlights: row.highlights ?? [],
    featured: row.featured,
    condition: row.condition,
    warranty: {
      months: row.warranty_months,
      type: row.warranty_type,
      notes: row.warranty_notes ?? undefined,
    },
    authenticity: {
      status: row.authenticity_status,
      notes: row.authenticity_notes ?? undefined,
    },
    specs: row.specs ?? {},
    kind: ((row.kind as ProductKind | null) ?? categoryKind) as ProductKind | undefined,
    options,
    variants,
    images,
    tone: row.tone ?? "",
    createdAt: row.created_at,
    popularity: row.popularity,
  };
}

const fetchFromSupabase = unstable_cache(
  async (): Promise<Catalog | null> => {
    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseEnv } = await import("./supabase/env");
    const { url, anonKey } = supabaseEnv();
    // Public reads only; use anon key with no cookies so results can be cached
    // across requests. RLS lets anon read published catalogue rows.
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

    const [cats, brs, defs, prods] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase.from("brands").select("id, name, slug").order("name"),
      supabase
        .from("spec_definitions")
        .select("id, category_id, key, label, type, unit, options, filterable")
        .order("sort_order")
        .order("label"),
      supabase
        .from("products")
        .select(
          "id, slug, name, brand_id, category_id, description, highlights, featured, condition, warranty_months, warranty_type, warranty_notes, authenticity_status, authenticity_notes, specs, kind, tone, popularity, created_at, product_options(name, position), product_images(url, alt, sort_order), variants(id, sku, option_values, price, compare_at_price, stock, is_active)",
        )
        .eq("status", "published"),
    ]);

    if (cats.error || brs.error || defs.error || prods.error) return null;

    const categories: Category[] = (cats.data ?? []).map((c) => ({
      id: c.id,
      parentId: c.parent_id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      kind: (c.kind as ProductKind) ?? "phone",
      imageUrl: c.image_url ?? undefined,
    }));
    const kindByCategory = new Map(categories.map((c) => [c.id, c.kind]));

    const brands: Brand[] = (brs.data ?? []).map((b) => ({ id: b.id, name: b.name, slug: b.slug }));

    const specDefinitions: SpecDefinition[] = (defs.data ?? []).map((d) => ({
      id: d.id,
      categoryId: d.category_id,
      key: d.key,
      label: d.label,
      type: d.type,
      unit: d.unit ?? undefined,
      options: d.options ?? undefined,
      filterable: d.filterable,
    }));

    const products: Product[] = (prods.data as ProductRow[] | null ?? [])
      .map((row) => mapProduct(row, kindByCategory.get(row.category_id)))
      // A published product with no active variants can't be bought; keep it out of
      // the storefront. The admin can see it and reactivate a variant.
      .filter((p) => p.variants.length > 0);

    return { categories, brands, specDefinitions, products };
  },
  ["catalog"],
  { tags: [CATALOG_TAG] },
);

export const loadCatalog = cache(async (): Promise<Catalog> => {
  if (!supabaseConfigured) return sampleCatalog;
  try {
    const data = await fetchFromSupabase();
    // Empty catalogue early on: fall back to sample data so the storefront isn't blank.
    if (!data || data.products.length === 0) return sampleCatalog;
    return data;
  } catch {
    return sampleCatalog;
  }
});

// --------------------------------------------------------------- categories

export async function getCategories(): Promise<Category[]> {
  return (await loadCatalog()).categories;
}

export async function getTopCategories(): Promise<Category[]> {
  const { categories } = await loadCatalog();
  return categories.filter((c) => c.parentId === null);
}

export async function getChildCategories(parentId: string): Promise<Category[]> {
  const { categories } = await loadCatalog();
  return categories.filter((c) => c.parentId === parentId);
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const { categories } = await loadCatalog();
  return categories.find((c) => c.slug === slug);
}

export async function getCategoryById(id: string): Promise<Category | undefined> {
  const { categories } = await loadCatalog();
  return categories.find((c) => c.id === id);
}

/** The category plus all of its descendants, used to include sub-category products. */
export async function getCategoryTreeIds(categoryId: string): Promise<string[]> {
  const { categories } = await loadCatalog();
  return treeIds(categories, categoryId);
}

function treeIds(categories: Category[], categoryId: string): string[] {
  const ids = [categoryId];
  for (const child of categories.filter((c) => c.parentId === categoryId)) {
    ids.push(...treeIds(categories, child.id));
  }
  return ids;
}

/** Breadcrumb trail from the top category down to this one. */
export async function getCategoryPath(categoryId: string): Promise<Category[]> {
  const { categories } = await loadCatalog();
  return categoryPath(categories, categoryId);
}

function categoryPath(categories: Category[], categoryId: string): Category[] {
  const path: Category[] = [];
  let current = categories.find((c) => c.id === categoryId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? categories.find((c) => c.id === current!.parentId) : undefined;
  }
  return path;
}

/** Spec fields for a category, including those inherited from its parents. */
export async function getSpecDefinitions(categoryId: string): Promise<SpecDefinition[]> {
  const { categories, specDefinitions } = await loadCatalog();
  const chain = categoryPath(categories, categoryId).map((c) => c.id);
  const byKey = new Map<string, SpecDefinition>();
  for (const id of chain) {
    for (const def of specDefinitions.filter((d) => d.categoryId === id)) {
      byKey.set(def.key, def);
    }
  }
  return [...byKey.values()];
}

// ------------------------------------------------------------------- brands

export async function getBrands(): Promise<Brand[]> {
  return (await loadCatalog()).brands;
}

export async function getBrandBySlug(slug: string): Promise<Brand | undefined> {
  const { brands } = await loadCatalog();
  return brands.find((b) => b.slug === slug);
}

export async function getBrandById(id: string): Promise<Brand | undefined> {
  const { brands } = await loadCatalog();
  return brands.find((b) => b.id === id);
}

// ---------------------------------------------------- product-derived helpers

export function getProductKind(product: Product): ProductKind {
  // Mapper already defaults product.kind to the category's kind.
  return product.kind ?? "phone";
}

export function getMinPrice(product: Product): number {
  return Math.min(...product.variants.map((v) => v.price));
}

export function getMaxPrice(product: Product): number {
  return Math.max(...product.variants.map((v) => v.price));
}

export function getTotalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}

export function isInStock(product: Product): boolean {
  return getTotalStock(product) > 0;
}

/** The variant to add straight from a product card: cheapest one that is in stock. */
export function getDefaultVariant(product: Product): Variant | undefined {
  return product.variants
    .filter((v) => v.stock > 0)
    .sort((a, b) => a.price - b.price)[0];
}

// ----------------------------------------------------------------- products

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const { products } = await loadCatalog();
  return products.find((p) => p.slug === slug);
}

export async function getAllProducts(): Promise<Product[]> {
  return (await loadCatalog()).products;
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const { products } = await loadCatalog();
  return products
    .filter((p) => p.featured && isInStock(p))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

export async function getNewArrivals(limit = 4): Promise<Product[]> {
  const { products } = await loadCatalog();
  return [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function getBestSellers(limit = 4): Promise<Product[]> {
  const { products } = await loadCatalog();
  return [...products].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const { products, categories } = await loadCatalog();
  const topFor = (categoryId: string) => categoryPath(categories, categoryId)[0]?.id;
  const scored = products
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      product: p,
      score:
        (p.categoryId === product.categoryId ? 3 : 0) +
        (topFor(p.categoryId) === topFor(product.categoryId) ? 2 : 0) +
        (p.brandId === product.brandId ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.product.popularity - a.product.popularity);
  // Related items first, then popular ones, so the row is never nearly empty in a small catalogue.
  return scored.slice(0, limit).map((r) => r.product);
}

function matchesText(product: Product, q: string, brandName: string, categoryName: string): boolean {
  const haystack = `${product.name} ${brandName} ${categoryName} ${product.description}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/** Option names like "RAM" or "Screen size" line up with spec keys like "ram" or "screen_size". */
export function optionKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

/** Every value a product offers for a spec: its base spec plus any variant option of the same name. */
function specValues(product: Product, key: string): string[] {
  const values = new Set<string>();
  if (product.specs[key] !== undefined) values.add(String(product.specs[key]));
  for (const option of product.options) {
    if (optionKey(option.name) !== key) continue;
    for (const v of product.variants) {
      if (v.stock > 0 && v.optionValues[option.name]) values.add(v.optionValues[option.name]);
    }
  }
  return [...values];
}

function specMatches(product: Product, key: string, wanted: string[]): boolean {
  return specValues(product, key).some((v) => wanted.includes(v));
}

export async function filterProducts(query: ShopQuery): Promise<Product[]> {
  const { products, categories, brands } = await loadCatalog();
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "";
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";

  let list = products;

  if (query.category) {
    const ids = new Set(treeIds(categories, query.category));
    list = list.filter((p) => ids.has(p.categoryId));
  }
  if (query.brands?.length) {
    const wanted = new Set(query.brands);
    list = list.filter((p) => wanted.has(p.brandId));
  }
  if (query.conditions?.length) {
    const wanted = new Set(query.conditions);
    list = list.filter((p) => wanted.has(p.condition));
  }
  if (query.min !== undefined) list = list.filter((p) => getMaxPrice(p) >= query.min!);
  if (query.max !== undefined) list = list.filter((p) => getMinPrice(p) <= query.max!);
  if (query.inStock) list = list.filter(isInStock);
  if (query.q) list = list.filter((p) => matchesText(p, query.q!, brandName(p.brandId), categoryName(p.categoryId)));
  if (query.specs) {
    for (const [key, wanted] of Object.entries(query.specs)) {
      if (wanted.length) list = list.filter((p) => specMatches(p, key, wanted));
    }
  }

  const sorted = [...list];
  switch (query.sort) {
    case "price-asc":
      sorted.sort((a, b) => getMinPrice(a) - getMinPrice(b));
      break;
    case "price-desc":
      sorted.sort((a, b) => getMinPrice(b) - getMinPrice(a));
      break;
    case "newest":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "popular":
      sorted.sort((a, b) => b.popularity - a.popularity);
      break;
    default:
      sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || b.popularity - a.popularity);
  }
  return sorted;
}

export function paginate<T>(items: T[], page = 1, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    totalPages,
    total: items.length,
  };
}

/** Selectable spec filters for the shop sidebar, limited to values that exist in the result set. */
export async function getSpecFilters(categoryId: string | undefined, pool: Product[]) {
  if (!categoryId) return [];
  const defs = await getSpecDefinitions(categoryId);
  return defs
    .filter((d) => d.filterable)
    .map((def) => {
      const present = new Set(pool.flatMap((p) => specValues(p, def.key)));
      const options =
        def.type === "boolean"
          ? ["true", "false"].filter((v) => present.has(v))
          : (def.options ?? []).filter((o) => present.has(o));
      return { def, options };
    })
    .filter((f) => f.options.length > 1);
}
