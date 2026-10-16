import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { CONTENT, requireStaff } from "@/lib/admin/auth";
import { descendantIds, flattenTree, inheritedSpecs, loadCategories, loadSpecDefs } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";
import { AddSpecForm, DeleteCategoryForm, EditCategoryForm, SpecRow } from "../forms";

export const metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  await requireStaff(CONTENT);
  const { id } = await params;
  const supabase = await createClient();
  const [categories, defs] = await Promise.all([loadCategories(supabase), loadSpecDefs(supabase)]);
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  const tree = flattenTree(categories);
  const own = defs.filter((d) => d.category_id === id).sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
  const inherited = inheritedSpecs(categories, defs, id).filter((d) => d.category_id !== id);

  return (
    <>
      <PageHeader
        title={category.name}
        description="Changes here update the shop menu and the product form."
        actions={
          <Link href="/admin/categories" className="text-sm font-medium text-marine-700 underline">
            ← All categories
          </Link>
        }
      />
      <div className="space-y-6">
        <Card title="Details">
          <EditCategoryForm
            category={category}
            options={tree.map((c) => ({ id: c.id, name: c.name, depth: c.depth }))}
            blocked={descendantIds(categories, id)}
          />
        </Card>

        <Card
          title="Spec fields"
          description="Products in this category (and its sub-categories) fill these in. Fields marked “filter” become shop filters."
        >
          {inherited.length > 0 && (
            <div className="mb-5 rounded-xl bg-surface p-4">
              <p className="text-sm font-medium text-marine-900">Inherited from parent categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {inherited.map((d) => (
                  <Badge key={d.id} tone="blue">
                    {d.label}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Edit these on the parent category.</p>
            </div>
          )}
          {own.length > 0 ? (
            <ul className="mb-6 space-y-3">
              {own.map((s) => (
                <SpecRow key={s.id} spec={s} categoryId={id} />
              ))}
            </ul>
          ) : (
            <p className="mb-6 text-sm text-muted">No fields of its own yet.</p>
          )}
          <h3 className="mb-3 text-sm font-semibold text-marine-900">Add a field</h3>
          <AddSpecForm categoryId={id} />
        </Card>

        <Card title="Delete category">
          <p className="mb-4 text-sm text-muted">
            You can only delete a category with no products and no sub-categories. To hide it instead, untick “Visible in the shop” above.
          </p>
          <DeleteCategoryForm id={id} name={category.name} />
        </Card>
      </div>
    </>
  );
}
