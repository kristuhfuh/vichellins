"use server";

import ExcelJS from "exceljs";
import { revalidatePath, updateTag } from "next/cache";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import {
  buildSavePayload,
  type ImportResult,
  parseProductRow,
  type ParsedProduct,
  type ParsedVariant,
  parseVariantRow,
  PRODUCT_COLUMNS,
  type ProductRow,
  VARIANT_COLUMNS,
  type VariantRow,
} from "@/lib/admin/bulk-import";
import { CATALOG_TAG } from "@/lib/catalog";
import { friendlyError } from "@/lib/admin/errors";
import { loadBrands, loadCategories } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PRODUCTS = 200;
const MAX_VARIANTS = 2000;

export type ImportState = {
  ok: boolean;
  message: string;
  results: ImportResult[];
};

const empty: ImportState = { ok: false, message: "", results: [] };

export async function importProducts(_prev: ImportState, form: FormData): Promise<ImportState> {
  await requireStaff(COMMERCE);

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ...empty, message: "Choose an .xlsx file to import." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ...empty, message: "File is too large. Keep imports under 5 MB." };
  }

  let workbook: ExcelJS.Workbook;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    workbook = new ExcelJS.Workbook();
    // ExcelJS's type expects Buffer<ArrayBuffer>; Node's Buffer.from returns Buffer<ArrayBufferLike>.
    // The two are interchangeable at runtime; the cast silences the mismatch.
    await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    return { ...empty, message: "That file couldn't be read as .xlsx. Try the template from this page." };
  }

  const productSheet = workbook.getWorksheet("Products");
  const variantSheet = workbook.getWorksheet("Variants");
  if (!productSheet || !variantSheet) {
    return {
      ...empty,
      message: "The file is missing the Products or Variants sheet. Use the template from this page.",
    };
  }

  const productRows = readRows<ProductRow>(productSheet, PRODUCT_COLUMNS as unknown as readonly string[]);
  const variantRows = readRows<VariantRow>(variantSheet, VARIANT_COLUMNS as unknown as readonly string[]);

  if (productRows.length === 0) {
    return { ...empty, message: "No product rows found. The Products sheet is empty." };
  }
  if (productRows.length > MAX_PRODUCTS) {
    return { ...empty, message: `Too many products (${productRows.length}). Keep imports under ${MAX_PRODUCTS}.` };
  }
  if (variantRows.length > MAX_VARIANTS) {
    return { ...empty, message: `Too many variants (${variantRows.length}). Keep imports under ${MAX_VARIANTS}.` };
  }

  const supabase = await createClient();
  const [brands, categories] = await Promise.all([loadBrands(supabase), loadCategories(supabase)]);

  // Validate every product row first; keep going even if some fail so we can
  // show all errors in one pass instead of making the owner upload six times.
  const results: ImportResult[] = [];
  const parsedProducts = new Map<string, ParsedProduct>();
  const name = (row: ProductRow, slug: string) => (row.name ?? "").trim() || slug;

  for (let i = 0; i < productRows.length; i++) {
    const row = productRows[i];
    const parsed = parseProductRow(row, i + 2, brands, categories);
    const slug = parsed.ok ? parsed.value.slug : (row.slug ?? "").trim().toLowerCase() || `row-${i + 2}`;
    if (!parsed.ok) {
      results.push({ rowIndex: i + 2, slug, name: name(row, slug), status: "error", message: parsed.error });
      continue;
    }
    if (parsedProducts.has(parsed.value.slug)) {
      results.push({
        rowIndex: i + 2,
        slug,
        name: name(row, slug),
        status: "error",
        message: `Duplicate slug "${parsed.value.slug}" in this file.`,
      });
      continue;
    }
    parsedProducts.set(parsed.value.slug, parsed.value);
  }

  // Validate variants and bucket them by product_slug.
  const variantsBySlug = new Map<string, ParsedVariant[]>();
  for (let i = 0; i < variantRows.length; i++) {
    const parsed = parseVariantRow(variantRows[i], i + 2);
    if (!parsed.ok) {
      results.push({
        rowIndex: i + 2,
        slug: (variantRows[i].product_slug ?? "").trim().toLowerCase() || `variant-row-${i + 2}`,
        name: `Variant row ${i + 2}`,
        status: "error",
        message: parsed.error,
      });
      continue;
    }
    const list = variantsBySlug.get(parsed.value.productSlug) ?? [];
    list.push(parsed.value);
    variantsBySlug.set(parsed.value.productSlug, list);
  }

  // Save each product that has at least one variant.
  for (const product of parsedProducts.values()) {
    const vs = variantsBySlug.get(product.slug) ?? [];
    if (vs.length === 0) {
      results.push({
        rowIndex: product.rowIndex,
        slug: product.slug,
        name: product.payload.name,
        status: "error",
        message: "No variants found for this product. Add at least one row in the Variants sheet.",
      });
      continue;
    }

    const payload = buildSavePayload(product, vs);
    const { data, error } = await supabase.rpc("save_product", { p: payload });
    if (error) {
      results.push({
        rowIndex: product.rowIndex,
        slug: product.slug,
        name: product.payload.name,
        status: "error",
        message: friendlyError(error),
      });
      continue;
    }
    results.push({
      rowIndex: product.rowIndex,
      slug: product.slug,
      name: product.payload.name,
      status: "created",
      message: typeof data === "string" ? data : undefined,
    });
  }

  const successes = results.filter((r) => r.status === "created").length;
  const failures = results.length - successes;

  if (successes > 0) {
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    updateTag(CATALOG_TAG);
  }

  const summary =
    successes === 0
      ? `Nothing imported. ${failures} row${failures === 1 ? "" : "s"} had problems — see below.`
      : failures === 0
        ? `Imported ${successes} product${successes === 1 ? "" : "s"}.`
        : `Imported ${successes} product${successes === 1 ? "" : "s"}, skipped ${failures}.`;

  return { ok: successes > 0, message: summary, results };
}

/**
 * Read rows from a sheet into typed row objects, aligned to the provided
 * column keys. Extra sheet columns are ignored; missing columns yield empty
 * strings so parsers can treat them uniformly.
 */
function readRows<T extends Record<string, string>>(
  sheet: ExcelJS.Worksheet,
  expected: readonly string[],
): T[] {
  const header = sheet.getRow(1);
  const columnIndex = new Map<string, number>();
  header.eachCell({ includeEmpty: false }, (cell, i) => {
    const name = String(cell.value ?? "").trim();
    if (name) columnIndex.set(name, i);
  });

  const out: T[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row || row.cellCount === 0) continue;

    const record: Record<string, string> = {};
    let any = false;
    for (const key of expected) {
      const i = columnIndex.get(key);
      const value = i ? row.getCell(i).value : "";
      const text = cellToString(value);
      record[key] = text;
      if (text) any = true;
    }
    if (any) out.push(record as T);
  }
  return out;
}

function cellToString(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && "text" in v && typeof v.text === "string") return v.text.trim();
  if (typeof v === "object" && "richText" in v && Array.isArray(v.richText)) {
    return v.richText.map((r: { text: string }) => r.text).join("").trim();
  }
  if (typeof v === "object" && "result" in v) return cellToString(v.result as ExcelJS.CellValue);
  if (typeof v === "object" && "formula" in v) return "";
  return String(v).trim();
}
