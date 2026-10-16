import { cache } from "react";
import { brands, categories, products, specDefinitions } from "./sample-data";
import type {
  Brand,
  Category,
  Product,
  ProductKind,
  ShopQuery,
  SpecDefinition,
  Variant,
} from "./types";

/**
 * Read access to the catalogue. Every page goes through these functions so
 * swapping the sample data for Supabase only touches this file.
 */

export const PAGE_SIZE = 9;

export function getCategories(): Category[] {
  return categories;
}

export const getTopCategories = cache((): Category[] => {
  return categories.filter((c) => c.parentId === null);
});

export function getChildCategories(parentId: string): Category[] {
  return categories.filter((c) => c.parentId === parentId);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

/** The category plus all of its descendants, used to include sub-category products. */
export function getCategoryTreeIds(categoryId: string): string[] {
  const ids = [categoryId];
  for (const child of getChildCategories(categoryId)) {
    ids.push(...getCategoryTreeIds(child.id));
  }
  return ids;
}

/** Breadcrumb trail from the top category down to this one. */
export function getCategoryPath(categoryId: string): Category[] {
  const path: Category[] = [];
  let current = getCategoryById(categoryId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? getCategoryById(current.parentId) : undefined;
  }
  return path;
}

/** Spec fields for a category, including those inherited from its parents. */
export function getSpecDefinitions(categoryId: string): SpecDefinition[] {
  const chain = getCategoryPath(categoryId).map((c) => c.id);
  const byKey = new Map<string, SpecDefinition>();
  for (const id of chain) {
    for (const def of specDefinitions.filter((d) => d.categoryId === id)) {
      byKey.set(def.key, def);
    }
  }
  return [...byKey.values()];
}

export function getBrands(): Brand[] {
  return brands;
}

export function getBrandBySlug(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug);
}

export function getBrandById(id: string): Brand | undefined {
  return brands.find((b) => b.id === id);
}

export function getProductKind(product: Product): ProductKind {
  return product.kind ?? getCategoryById(product.categoryId)?.kind ?? "phone";
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

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getAllProducts(): Product[] {
  return products;
}

export function getFeaturedProducts(limit = 8): Product[] {
  return products
    .filter((p) => p.featured && isInStock(p))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

export function getNewArrivals(limit = 4): Product[] {
  return [...products]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getBestSellers(limit = 4): Product[] {
  return [...products].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const scored = products
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      product: p,
      score:
        (p.categoryId === product.categoryId ? 3 : 0) +
        (getCategoryPath(p.categoryId)[0]?.id === getCategoryPath(product.categoryId)[0]?.id ? 2 : 0) +
        (p.brandId === product.brandId ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.product.popularity - a.product.popularity);
  // Related items first, then popular ones, so the row is never nearly empty in a small catalogue.
  return scored.slice(0, limit).map((r) => r.product);
}

function matchesText(product: Product, q: string): boolean {
  const brand = getBrandById(product.brandId)?.name ?? "";
  const category = getCategoryById(product.categoryId)?.name ?? "";
  const haystack = `${product.name} ${brand} ${category} ${product.description}`.toLowerCase();
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

export function filterProducts(query: ShopQuery): Product[] {
  let list = products;

  if (query.category) {
    const ids = new Set(getCategoryTreeIds(query.category));
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
  if (query.q) list = list.filter((p) => matchesText(p, query.q!));
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
export function getSpecFilters(categoryId: string | undefined, pool: Product[]) {
  if (!categoryId) return [];
  return getSpecDefinitions(categoryId)
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
