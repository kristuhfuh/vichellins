import "server-only";
import type { CategoryRow, BrandRow } from "./queries";

/**
 * Shared schema and helpers for the Excel template + import flow in
 * /admin/products/import. Column names are also written into the template so
 * the owner can match the sheet 1:1 with what's expected here.
 */

export const PRODUCT_COLUMNS = [
  "slug",
  "name",
  "brand",
  "category",
  "description",
  "highlights",
  "status",
  "featured",
  "condition",
  "warranty_months",
  "warranty_type",
  "warranty_notes",
  "authenticity_status",
  "authenticity_notes",
  "kind",
  "tone",
  "specs",
  "seo_title",
  "seo_description",
] as const;

export const VARIANT_COLUMNS = [
  "product_slug",
  "sku",
  "option_1_name",
  "option_1_value",
  "option_2_name",
  "option_2_value",
  "option_3_name",
  "option_3_value",
  "price",
  "compare_at_price",
  "stock",
  "low_stock_threshold",
  "active",
] as const;

export type ProductRow = Record<(typeof PRODUCT_COLUMNS)[number], string>;
export type VariantRow = Record<(typeof VARIANT_COLUMNS)[number], string>;

export const STATUS_VALUES = ["draft", "published", "archived"] as const;
export const CONDITION_VALUES = ["new", "refurbished", "used"] as const;
export const WARRANTY_TYPE_VALUES = ["manufacturer", "store", "none"] as const;
export const AUTHENTICITY_VALUES = ["verified", "unverified"] as const;
export const YES_NO_VALUES = ["yes", "no"] as const;

type Yes = "yes" | "no";

function parseBool(s: string): Yes | null {
  const v = s.trim().toLowerCase();
  if (v === "yes" || v === "true" || v === "1") return "yes";
  if (v === "no" || v === "false" || v === "0" || v === "") return "no";
  return null;
}

function parseInteger(s: string): number | null {
  const t = s.replace(/[,\s]/g, "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : null;
}

/**
 * Category names in the template can be unique leaf names like "Headphones", or
 * fully qualified "Audio > Headphones" to disambiguate when the same leaf name
 * exists under more than one parent.
 */
export function resolveCategory(name: string, categories: CategoryRow[]): CategoryRow | null {
  const want = name.trim().toLowerCase();
  if (!want) return null;
  if (want.includes(">")) {
    const parts = want.split(">").map((p) => p.trim());
    let current: CategoryRow | undefined;
    for (const part of parts) {
      current = categories.find(
        (c) => c.name.toLowerCase() === part && c.parent_id === (current?.id ?? null),
      );
      if (!current) return null;
    }
    return current ?? null;
  }
  const matches = categories.filter((c) => c.name.toLowerCase() === want);
  return matches.length === 1 ? matches[0] : null;
}

export function resolveBrand(name: string, brands: BrandRow[]): BrandRow | null {
  const want = name.trim().toLowerCase();
  if (!want) return null;
  return brands.find((b) => b.name.toLowerCase() === want) ?? null;
}

export type ParsedProduct = {
  slug: string;
  rowIndex: number;
  payload: {
    name: string;
    slug: string;
    brand_id: string | null;
    category_id: string;
    description: string;
    highlights: string[];
    status: (typeof STATUS_VALUES)[number];
    featured: boolean;
    condition: (typeof CONDITION_VALUES)[number];
    warranty_months: number;
    warranty_type: (typeof WARRANTY_TYPE_VALUES)[number];
    warranty_notes: string;
    authenticity_status: (typeof AUTHENTICITY_VALUES)[number];
    authenticity_notes: string;
    kind: string | null;
    tone: string | null;
    specs: Record<string, string | number | boolean>;
    seo_title: string;
    seo_description: string;
  };
};

export type ParsedVariant = {
  rowIndex: number;
  productSlug: string;
  option_values: Record<string, string>;
  options: { name: string; value: string }[];
  sku: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
};

export function parseProductRow(
  row: ProductRow,
  rowIndex: number,
  brands: BrandRow[],
  categories: CategoryRow[],
): { ok: true; value: ParsedProduct } | { ok: false; error: string } {
  const name = (row.name ?? "").trim();
  if (!name) return { ok: false, error: "`name` is required" };

  const slug = ((row.slug ?? "").trim() || slugify(name)).toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, error: "`slug` must only contain lowercase letters, numbers and dashes" };
  }

  const categoryName = (row.category ?? "").trim();
  if (!categoryName) return { ok: false, error: "`category` is required" };
  const category = resolveCategory(categoryName, categories);
  if (!category) {
    return { ok: false, error: `category "${categoryName}" not found. Use the Reference sheet to see the exact names.` };
  }

  const brandName = (row.brand ?? "").trim();
  let brandId: string | null = null;
  if (brandName) {
    const brand = resolveBrand(brandName, brands);
    if (!brand) return { ok: false, error: `brand "${brandName}" not found` };
    brandId = brand.id;
  }

  const status = ((row.status ?? "draft").trim().toLowerCase() || "draft") as (typeof STATUS_VALUES)[number];
  if (!STATUS_VALUES.includes(status)) {
    return { ok: false, error: `status must be one of ${STATUS_VALUES.join(", ")}` };
  }

  const condition = ((row.condition ?? "new").trim().toLowerCase() || "new") as (typeof CONDITION_VALUES)[number];
  if (!CONDITION_VALUES.includes(condition)) {
    return { ok: false, error: `condition must be one of ${CONDITION_VALUES.join(", ")}` };
  }

  const warrantyType = ((row.warranty_type ?? "none").trim().toLowerCase() ||
    "none") as (typeof WARRANTY_TYPE_VALUES)[number];
  if (!WARRANTY_TYPE_VALUES.includes(warrantyType)) {
    return { ok: false, error: `warranty_type must be one of ${WARRANTY_TYPE_VALUES.join(", ")}` };
  }

  const warrantyMonths = parseInteger(row.warranty_months ?? "0") ?? 0;
  if (warrantyMonths < 0 || warrantyMonths > 120) {
    return { ok: false, error: "warranty_months must be between 0 and 120" };
  }

  const authenticity = ((row.authenticity_status ?? "unverified").trim().toLowerCase() ||
    "unverified") as (typeof AUTHENTICITY_VALUES)[number];
  if (!AUTHENTICITY_VALUES.includes(authenticity)) {
    return { ok: false, error: `authenticity_status must be one of ${AUTHENTICITY_VALUES.join(", ")}` };
  }

  const featured = parseBool(row.featured ?? "no");
  if (featured === null) return { ok: false, error: "featured must be yes or no" };

  const highlights = (row.highlights ?? "")
    .split(/[;\n]/)
    .map((h) => h.trim())
    .filter(Boolean);

  let specs: Record<string, string | number | boolean> = {};
  const specsRaw = (row.specs ?? "").trim();
  if (specsRaw) {
    try {
      const parsed = JSON.parse(specsRaw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "specs must be a JSON object like {\"ram\":\"8GB\"}" };
      }
      specs = parsed as Record<string, string | number | boolean>;
    } catch {
      return { ok: false, error: "specs must be valid JSON" };
    }
  }

  return {
    ok: true,
    value: {
      slug,
      rowIndex,
      payload: {
        name,
        slug,
        brand_id: brandId,
        category_id: category.id,
        description: (row.description ?? "").trim(),
        highlights,
        status,
        featured: featured === "yes",
        condition,
        warranty_months: warrantyMonths,
        warranty_type: warrantyType,
        warranty_notes: (row.warranty_notes ?? "").trim(),
        authenticity_status: authenticity,
        authenticity_notes: (row.authenticity_notes ?? "").trim(),
        kind: (row.kind ?? "").trim() || null,
        tone: (row.tone ?? "").trim() || null,
        specs,
        seo_title: (row.seo_title ?? "").trim(),
        seo_description: (row.seo_description ?? "").trim(),
      },
    },
  };
}

export function parseVariantRow(
  row: VariantRow,
  rowIndex: number,
): { ok: true; value: ParsedVariant } | { ok: false; error: string } {
  const productSlug = (row.product_slug ?? "").trim().toLowerCase();
  if (!productSlug) return { ok: false, error: "`product_slug` is required" };

  const sku = (row.sku ?? "").trim();
  if (!sku) return { ok: false, error: "`sku` is required" };

  const price = parseInteger(row.price ?? "");
  if (price === null || price < 0) return { ok: false, error: "`price` must be a whole number of naira" };

  const compareRaw = (row.compare_at_price ?? "").trim();
  const compareAt = compareRaw ? parseInteger(compareRaw) : null;
  if (compareRaw && (compareAt === null || compareAt < price)) {
    return { ok: false, error: "`compare_at_price` must be a whole number ≥ price" };
  }

  const stock = parseInteger(row.stock ?? "0") ?? 0;
  if (stock < 0) return { ok: false, error: "`stock` can't be negative" };

  const threshold = parseInteger(row.low_stock_threshold ?? "3") ?? 3;
  if (threshold < 0) return { ok: false, error: "`low_stock_threshold` can't be negative" };

  const activeFlag = parseBool(row.active ?? "yes");
  if (activeFlag === null) return { ok: false, error: "`active` must be yes or no" };

  const options: { name: string; value: string }[] = [];
  for (let i = 1; i <= 3; i++) {
    const name = (row[`option_${i}_name` as keyof VariantRow] ?? "").trim();
    const value = (row[`option_${i}_value` as keyof VariantRow] ?? "").trim();
    if (name && value) options.push({ name, value });
    else if (name || value) {
      return { ok: false, error: `option_${i}_name and option_${i}_value must both be set or both empty` };
    }
  }
  if (options.length === 0) {
    // A single-variant product still needs one unique option combo. We synthesise one.
    options.push({ name: "Default", value: "Default" });
  }

  return {
    ok: true,
    value: {
      rowIndex,
      productSlug,
      sku,
      price,
      compare_at_price: compareAt,
      stock,
      low_stock_threshold: threshold,
      is_active: activeFlag === "yes",
      options,
      option_values: Object.fromEntries(options.map((o) => [o.name, o.value])),
    },
  };
}

/**
 * Build the save_product RPC payload from a parsed product + its variants.
 * Mirrors toRpcPayload() in product-payload.ts without needing a form payload.
 */
export function buildSavePayload(product: ParsedProduct, variants: ParsedVariant[]) {
  // Group option values across variants to form the product's options list.
  const byName = new Map<string, { name: string; values: Set<string> }>();
  for (const v of variants) {
    for (const o of v.options) {
      const existing = byName.get(o.name) ?? { name: o.name, values: new Set() };
      existing.values.add(o.value);
      byName.set(o.name, existing);
    }
  }
  const options = [...byName.values()].map((o) => ({ name: o.name, values: [...o.values] }));

  return {
    id: null,
    ...product.payload,
    options,
    variants: variants.map((v) => ({
      id: null,
      sku: v.sku,
      option_values: v.option_values,
      price: v.price,
      compare_at_price: v.compare_at_price,
      stock: v.stock,
      low_stock_threshold: v.low_stock_threshold,
      is_active: v.is_active,
    })),
  };
}

/** Local slugify copy to avoid dragging the util into the bulk-import type-only surface. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type ImportResult = {
  rowIndex: number;
  slug: string;
  name: string;
  status: "created" | "error";
  message?: string;
};
