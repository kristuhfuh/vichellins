import Link from "next/link";
import Image from "next/image";
import { Badge, Card, EmptyState, PageHeader, Table, td, th } from "@/components/admin/ui";
import { CONTENT, requireStaff } from "@/lib/admin/auth";
import { flattenTree, loadCategories, loadSpecDefs } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";
import { AddCategoryForm } from "./forms";

export const metadata = { title: "Categories & specs" };

export default async function CategoriesPage() {
  await requireStaff(CONTENT);
  const supabase = await createClient();
  const [categories, specs, { data: products }] = await Promise.all([
    loadCategories(supabase),
    loadSpecDefs(supabase),
    supabase.from("products").select("category_id"),
  ]);
  const tree = flattenTree(categories);
  const productCount = new Map<string, number>();
  for (const p of products ?? []) productCount.set(p.category_id, (productCount.get(p.category_id) ?? 0) + 1);
  const specCount = new Map<string, number>();
  for (const s of specs) specCount.set(s.category_id, (specCount.get(s.category_id) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title="Categories & specs"
        description="Categories organise the shop. Each category can have its own spec fields (RAM for laptops, battery life for speakers), which appear on the product form and as shop filters."
      />
      <div className="space-y-6">
        <Card title="Add a category">
          <AddCategoryForm options={tree.map((c) => ({ id: c.id, name: c.name, depth: c.depth }))} />
        </Card>

        {tree.length === 0 ? (
          <EmptyState title="No categories yet" body="Add your first category above." />
        ) : (
          <Table>
            <thead className="border-b border-line">
              <tr>
                <th className={th}>Category</th>
                <th className={th}>Products</th>
                <th className={th}>Own spec fields</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tree.map((c) => (
                <tr key={c.id}>
                  <td className={td}>
                    <span style={{ paddingLeft: `${Math.min(c.depth, 5) * 20}px` }} className="inline-flex items-center gap-3 font-medium">
                      {c.image_url && <Image src={c.image_url} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg bg-surface object-contain" />}
                      {c.depth > 0 && <span className="mr-1.5 text-muted">↳</span>}
                      {c.name}
                    </span>
                  </td>
                  <td className={td}>{productCount.get(c.id) ?? 0}</td>
                  <td className={td}>{specCount.get(c.id) ?? 0}</td>
                  <td className={td}>{c.is_active ? <Badge tone="green">Visible</Badge> : <Badge>Hidden</Badge>}</td>
                  <td className={`${td} text-right`}>
                    <Link href={`/admin/categories/${c.id}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-marine-700 underline underline-offset-4 hover:bg-marine-50">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
