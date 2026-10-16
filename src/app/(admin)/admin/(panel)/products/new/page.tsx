import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { flattenTree, inheritedSpecs, loadBrands, loadCategories, loadSpecDefs } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";
import { ProductForm, type SpecDefLite } from "../ProductForm";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireStaff(COMMERCE);
  const supabase = await createClient();
  const [categories, brands, defs] = await Promise.all([loadCategories(supabase), loadBrands(supabase), loadSpecDefs(supabase)]);
  const tree = flattenTree(categories);

  if (tree.length === 0) {
    return (
      <>
        <PageHeader title="New product" />
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-marine-900">
          Add a category first under <Link className="underline" href="/admin/categories">Categories &amp; specs</Link>, then come back to add products.
        </p>
      </>
    );
  }

  const specsByCategory: Record<string, SpecDefLite[]> = {};
  for (const c of categories) specsByCategory[c.id] = inheritedSpecs(categories, defs, c.id);

  return (
    <>
      <PageHeader title="New product" description="Fill in the details, then add photos once the product is created." />
      <ProductForm
        product={null}
        categories={tree.map((c) => ({ id: c.id, name: c.name, depth: c.depth }))}
        brands={brands}
        specsByCategory={specsByCategory}
      />
    </>
  );
}
