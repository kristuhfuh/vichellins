import "server-only";
import { z } from "zod";
import type { CategoryRow, SpecDefRow } from "./queries";
import { inheritedSpecs } from "./queries";
import { optionKey, slugify } from "./util";

const text = (max: number) => z.string().trim().max(max);

export const productPayloadSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: text(160),
  slug: text(100),
  slug_auto: z.boolean().optional(),
  brand_id: z.string().uuid().nullable().optional().or(z.literal("")),
  category_id: z.string().uuid(),
  status: z.enum(["draft", "published", "archived"]),
  featured: z.boolean(),
  description: text(5000),
  highlights: z.array(text(200)).max(12),
  condition: z.enum(["new", "refurbished", "used"]),
  warranty_months: z.number().int().min(0).max(120),
  warranty_type: z.enum(["manufacturer", "store", "none"]),
  warranty_notes: text(500),
  authenticity_status: z.enum(["verified", "unverified"]),
  authenticity_notes: text(500),
  specs: z.record(z.string(), z.string()),
  seo_title: text(120),
  seo_description: text(300),
  kind: z.string().nullable().optional(),
  tone: z.string().nullable().optional(),
  options: z
    .array(z.object({ name: text(40), values: z.array(text(60)).max(30) }))
    .max(3),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().nullable().optional(),
        option_values: z.record(z.string(), z.string()),
        sku: text(60),
        price: z.number().int().min(0).nullable(),
        compare_at_price: z.number().int().min(0).nullable(),
        stock: z.number().int().min(0).nullable(),
        low_stock_threshold: z.number().int().min(0).max(1000),
        is_active: z.boolean(),
      }),
    )
    .min(1)
    .max(200),
});

export type ProductPayload = z.infer<typeof productPayloadSchema>;

/**
 * Checks each spec value against the category's field definitions and drops
 * anything the category doesn't define. Returns clean values or a message.
 */
export function normaliseSpecs(
  payload: ProductPayload,
  categories: CategoryRow[],
  defs: SpecDefRow[],
): { specs: Record<string, string | number | boolean> } | { error: string } {
  const optionKeys = new Set(payload.options.map((o) => optionKey(o.name)));
  const specs: Record<string, string | number | boolean> = {};
  const missing: string[] = [];

  for (const def of inheritedSpecs(categories, defs, payload.category_id)) {
    // Specs the shopper picks as variant options live on the variants instead.
    if (optionKeys.has(def.key)) continue;
    const raw = (payload.specs[def.key] ?? "").trim();
    if (raw === "") {
      if (def.required) missing.push(def.label);
      continue;
    }
    switch (def.type) {
      case "number": {
        const n = Number(raw.replace(/,/g, ""));
        if (!Number.isFinite(n)) return { error: `${def.label} must be a number.` };
        specs[def.key] = n;
        break;
      }
      case "boolean":
        if (raw !== "true" && raw !== "false") return { error: `${def.label} must be Yes or No.` };
        specs[def.key] = raw === "true";
        break;
      case "select":
        if (!def.options?.includes(raw)) return { error: `${def.label}: "${raw}" isn't one of the choices.` };
        specs[def.key] = raw;
        break;
      default:
        specs[def.key] = raw.slice(0, 200);
    }
  }

  if (payload.status === "published" && missing.length > 0) {
    return { error: `Fill in the required specs before publishing: ${missing.join(", ")}.` };
  }
  return { specs };
}

/** Variant checks that give friendlier messages than the database errors. */
export function checkVariants(payload: ProductPayload): string | null {
  for (const v of payload.variants) {
    const label = Object.values(v.option_values).join(" / ") || "the variant";
    if (v.sku === "") return `Enter a SKU for ${label}.`;
    if (v.price === null) return `Enter a price for ${label}.`;
    if (v.compare_at_price !== null && v.compare_at_price < v.price) {
      return `The compare-at price for ${label} can't be lower than its price.`;
    }
  }
  return null;
}

export function toRpcPayload(payload: ProductPayload, specs: Record<string, string | number | boolean>, slug: string) {
  return {
    id: payload.id ?? null,
    name: payload.name,
    slug,
    brand_id: payload.brand_id || null,
    category_id: payload.category_id,
    description: payload.description,
    highlights: payload.highlights.filter(Boolean),
    status: payload.status,
    featured: payload.featured,
    condition: payload.condition,
    warranty_months: payload.warranty_type === "none" ? 0 : payload.warranty_months,
    warranty_type: payload.warranty_type,
    warranty_notes: payload.warranty_notes,
    authenticity_status: payload.authenticity_status,
    authenticity_notes: payload.authenticity_notes,
    specs,
    kind: payload.kind || null,
    tone: payload.tone || null,
    seo_title: payload.seo_title,
    seo_description: payload.seo_description,
    options: payload.options.map((o) => ({ name: o.name, values: o.values })),
    variants: payload.variants.map((v) => ({
      id: v.id ?? null,
      sku: v.sku,
      option_values: v.option_values,
      price: v.price,
      compare_at_price: v.compare_at_price,
      stock: v.id ? undefined : (v.stock ?? 0),
      low_stock_threshold: v.low_stock_threshold,
      is_active: v.is_active,
    })),
  };
}

export { slugify };
