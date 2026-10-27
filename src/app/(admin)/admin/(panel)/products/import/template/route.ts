import ExcelJS from "exceljs";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import {
  AUTHENTICITY_VALUES,
  CONDITION_VALUES,
  PRODUCT_COLUMNS,
  STATUS_VALUES,
  VARIANT_COLUMNS,
  WARRANTY_TYPE_VALUES,
  YES_NO_VALUES,
} from "@/lib/admin/bulk-import";
import { flattenTree, loadBrands, loadCategories } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Download an .xlsx template pre-populated with:
 *  - header rows for the Products and Variants sheets
 *  - one worked example per sheet
 *  - a Reference sheet listing the current brands and categories so the
 *    owner can see exactly what names are allowed
 */
export async function GET() {
  await requireStaff(COMMERCE);

  const supabase = await createClient();
  const [brands, categories] = await Promise.all([loadBrands(supabase), loadCategories(supabase)]);
  const categoryPaths = buildCategoryPaths(categories);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Vichellins Nation";
  workbook.created = new Date();

  // --- Products sheet --------------------------------------------------------
  const products = workbook.addWorksheet("Products", { views: [{ state: "frozen", ySplit: 1 }] });
  products.columns = PRODUCT_COLUMNS.map((key) => ({ header: key, key, width: columnWidth(key) }));
  styleHeader(products.getRow(1));

  const sampleCategoryName = categoryPaths[0]?.path ?? "Phones";
  const sampleBrandName = brands[0]?.name ?? "";
  products.addRow({
    slug: "example-phone",
    name: "Example Phone",
    brand: sampleBrandName,
    category: sampleCategoryName,
    description: "A short, honest description of the product.",
    highlights: "6.5 inch display; 128GB storage; 4500mAh battery",
    status: "draft",
    featured: "no",
    condition: "new",
    warranty_months: 12,
    warranty_type: "manufacturer",
    warranty_notes: "",
    authenticity_status: "verified",
    authenticity_notes: "Sealed box. IMEI checked.",
    kind: "",
    tone: "",
    specs: '{"storage":"128GB","ram":"6GB"}',
    seo_title: "",
    seo_description: "",
  });

  // --- Variants sheet --------------------------------------------------------
  const variants = workbook.addWorksheet("Variants", { views: [{ state: "frozen", ySplit: 1 }] });
  variants.columns = VARIANT_COLUMNS.map((key) => ({ header: key, key, width: columnWidth(key) }));
  styleHeader(variants.getRow(1));

  // Two example variants that pair with the Products example row above.
  variants.addRow({
    product_slug: "example-phone",
    sku: "EX-PHONE-128-BLK",
    option_1_name: "Colour",
    option_1_value: "Black",
    option_2_name: "",
    option_2_value: "",
    option_3_name: "",
    option_3_value: "",
    price: 129000,
    compare_at_price: "",
    stock: 4,
    low_stock_threshold: 3,
    active: "yes",
  });
  variants.addRow({
    product_slug: "example-phone",
    sku: "EX-PHONE-128-BLU",
    option_1_name: "Colour",
    option_1_value: "Blue",
    option_2_name: "",
    option_2_value: "",
    option_3_name: "",
    option_3_value: "",
    price: 129000,
    compare_at_price: "",
    stock: 2,
    low_stock_threshold: 3,
    active: "yes",
  });

  // --- Reference sheet -------------------------------------------------------
  const ref = workbook.addWorksheet("Reference");
  ref.getColumn(1).width = 32;
  ref.getColumn(2).width = 50;
  ref.getColumn(3).width = 32;
  ref.getColumn(4).width = 32;

  const title = ref.addRow(["Use these exact names in the Products sheet."]);
  title.font = { italic: true, color: { argb: "FF5B6472" } };
  ref.addRow([]);

  const brandHeader = ref.addRow(["Brands", "Categories (use the full path)", "Status", "Condition"]);
  styleHeader(brandHeader);

  const maxLen = Math.max(brands.length, categoryPaths.length, STATUS_VALUES.length, CONDITION_VALUES.length);
  for (let i = 0; i < maxLen; i++) {
    ref.addRow([
      brands[i]?.name ?? "",
      categoryPaths[i]?.path ?? "",
      STATUS_VALUES[i] ?? "",
      CONDITION_VALUES[i] ?? "",
    ]);
  }

  ref.addRow([]);
  const enumHeader = ref.addRow(["Warranty type", "Authenticity", "Yes/No", ""]);
  styleHeader(enumHeader);
  const maxEnum = Math.max(WARRANTY_TYPE_VALUES.length, AUTHENTICITY_VALUES.length, YES_NO_VALUES.length);
  for (let i = 0; i < maxEnum; i++) {
    ref.addRow([
      WARRANTY_TYPE_VALUES[i] ?? "",
      AUTHENTICITY_VALUES[i] ?? "",
      YES_NO_VALUES[i] ?? "",
      "",
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vichellins-products-template.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

type CategoryPath = { id: string; path: string };

function buildCategoryPaths(categories: ReturnType<typeof flattenTree> | Awaited<ReturnType<typeof loadCategories>>): CategoryPath[] {
  // flattenTree gives rows with depth; we rebuild "Parent > Child" from parent links.
  const byId = new Map(categories.map((c) => [c.id, c]));
  const pathFor = (c: (typeof categories)[number]): string => {
    const parts: string[] = [c.name];
    let current = c.parent_id ? byId.get(c.parent_id) : undefined;
    while (current) {
      parts.unshift(current.name);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    return parts.join(" > ");
  };
  return categories.map((c) => ({ id: c.id, path: pathFor(c) }));
}

function columnWidth(key: string): number {
  if (key === "description" || key === "highlights" || key === "specs") return 40;
  if (key === "name" || key === "warranty_notes" || key === "authenticity_notes") return 28;
  if (key.endsWith("_name") || key.endsWith("_value")) return 18;
  if (key === "product_slug" || key === "slug" || key === "category") return 24;
  return 16;
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1212B0" } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
}
