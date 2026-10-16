import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { flattenTree, inheritedSpecs, loadBrands, loadCategories, loadSpecDefs } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";
import { ImageManager } from "../ImageManager";
import { ProductForm, SavedNotice, type ProductData, type SpecDefLite } from "../ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireStaff(COMMERCE);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: row }, categories, brands, defs] = await Promise.all([
    supabase
      .from("products")
      .select(
        "*, product_options(name, position, product_option_values(value, position)), variants(id, sku, option_values, price, compare_at_price, stock, low_stock_threshold, is_active, created_at), product_images(id, url, alt, sort_order)",
      )
      .eq("id", id)
      .maybeSingle(),
    loadCategories(supabase),
    loadBrands(supabase),
    loadSpecDefs(supabase),
  ]);
  if (!row) notFound();

  const options = [...(row.product_options ?? [])]
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((o: { name: string; product_option_values: { value: string; position: number }[] }) => ({
      name: o.name,
      values: [...o.product_option_values].sort((a, b) => a.position - b.position).map((v) => v.value),
    }));
  const variants = [...(row.variants ?? [])].sort((a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at));

  const product: ProductData = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand_id: row.brand_id,
    category_id: row.category_id,
    status: row.status,
    featured: row.featured,
    description: row.description,
    highlights: row.highlights ?? [],
    condition: row.condition,
    warranty_months: row.warranty_months,
    warranty_type: row.warranty_type,
    warranty_notes: row.warranty_notes,
    authenticity_status: row.authenticity_status,
    authenticity_notes: row.authenticity_notes,
    specs: row.specs ?? {},
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    kind: row.kind,
    tone: row.tone,
    options,
    variants,
  };

  const specsByCategory: Record<string, SpecDefLite[]> = {};
  for (const c of categories) specsByCategory[c.id] = inheritedSpecs(categories, defs, c.id);
  const tree = flattenTree(categories);

  return (
    <>
      <PageHeader
        title={row.name}
        description={`Last saved ${new Date(row.updated_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })}`}
        actions={
          <>
            <StatusBadge status={row.status} />
            {row.status === "published" && (
              <Link href={`/product/${row.slug}`} target="_blank" className="text-sm font-medium text-marine-700 underline">
                View in shop ↗
              </Link>
            )}
          </>
        }
      />
      <SavedNotice created={query.created === "1"} saved={query.saved === "1"} />
      <div className="space-y-6">
        <ProductForm
          // Remounts after every save so new variants pick up their ids and the form matches the database.
          key={`${row.updated_at}:${variants.map((v: { id: string }) => v.id).join()}`}
          product={product}
          categories={tree.map((c) => ({ id: c.id, name: c.name, depth: c.depth }))}
          brands={brands}
          specsByCategory={specsByCategory}
        />
        <ImageManager productId={row.id} initial={row.product_images ?? []} />
      </div>
    </>
  );
}
