import { EmptyState, PageHeader } from "@/components/admin/ui";
import { CONTENT, requireStaff } from "@/lib/admin/auth";
import { loadBrands } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";
import { AddBrandForm } from "./AddBrandForm";
import { BrandRow } from "./BrandRow";

export const metadata = { title: "Brands" };

export default async function BrandsPage() {
  await requireStaff(CONTENT);
  const supabase = await createClient();
  const [brands, { data: products }] = await Promise.all([
    loadBrands(supabase),
    supabase.from("products").select("brand_id"),
  ]);
  const counts = new Map<string, number>();
  for (const p of products ?? []) {
    if (p.brand_id) counts.set(p.brand_id, (counts.get(p.brand_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="Brands" description="Brands appear on product pages and as a filter in the shop." />
      <div className="space-y-6">
        <AddBrandForm />
        {brands.length === 0 ? (
          <EmptyState title="No brands yet" body="Add your first brand above, then pick it when you add products." />
        ) : (
          <ul className="space-y-3">
            {brands.map((b) => (
              <BrandRow key={b.id} id={b.id} name={b.name} productCount={counts.get(b.id) ?? 0} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
