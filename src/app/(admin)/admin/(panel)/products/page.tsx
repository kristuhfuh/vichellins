import Link from "next/link";
import { EmptyState, LinkButton, PageHeader, StatusBadge, Table, td, th, inputClass, buttonStyles } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { flattenTree, loadCategories } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Products" };

const PAGE_SIZE = 20;

type Row = {
  id: string;
  name: string;
  slug: string;
  status: string;
  featured: boolean;
  category: { name: string } | null;
  brand: { name: string } | null;
  variants: { price: number; stock: number; is_active: boolean }[];
  product_images: { url: string; sort_order: number }[];
};

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaff(COMMERCE);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const status = typeof params.status === "string" ? params.status : "";
  const category = typeof params.category === "string" ? params.category : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "id, name, slug, status, featured, category:categories(name), brand:brands(name), variants(price, stock, is_active), product_images(url, sort_order)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  if (["draft", "published", "archived"].includes(status)) query = query.eq("status", status);
  if (/^[0-9a-f-]{36}$/i.test(category)) query = query.eq("category_id", category);

  const [{ data, count }, categories] = await Promise.all([query, loadCategories(supabase)]);
  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    if (category) next.set("category", category);
    if (p > 1) next.set("page", String(p));
    const s = next.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        actions={<LinkButton href="/admin/products/new" variant="primary">Add product</LinkButton>}
      />

      <form className="mb-5 flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="q" className="text-sm font-medium text-marine-900">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Product name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="status" className="text-sm font-medium text-marine-900">Status</label>
          <select id="status" name="status" defaultValue={status} className={inputClass}>
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label htmlFor="category" className="text-sm font-medium text-marine-900">Category</label>
          <select id="category" name="category" defaultValue={category} className={inputClass}>
            <option value="">All</option>
            {flattenTree(categories).map((c) => (
              <option key={c.id} value={c.id}>{"— ".repeat(c.depth)}{c.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonStyles.secondary}>Filter</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={q || status || category ? "No products match" : "No products yet"}
          body={q || status || category ? "Try a different search or clear the filters." : "Add your first product to start selling."}
          action={<LinkButton href="/admin/products/new" variant="primary">Add product</LinkButton>}
        />
      ) : (
        <Table>
          <thead className="border-b border-line">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Category</th>
              <th className={th}>Status</th>
              <th className={th}>Price</th>
              <th className={th}>Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => {
              const active = p.variants.filter((v) => v.is_active);
              const prices = active.map((v) => v.price);
              const stock = active.reduce((n, v) => n + v.stock, 0);
              const image = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
              return (
                <tr key={p.id}>
                  <td className={td}>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image.url} alt="" className="h-10 w-10 rounded-lg bg-surface object-contain" />
                      ) : (
                        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-xs text-muted">–</span>
                      )}
                      <span>
                        <span className="block font-medium text-marine-900 hover:underline">{p.name}</span>
                        <span className="block text-xs text-muted">
                          {p.brand?.name ?? "No brand"}
                          {p.featured && " · Featured"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className={td}>{p.category?.name ?? "–"}</td>
                  <td className={td}><StatusBadge status={p.status} /></td>
                  <td className={td}>
                    {prices.length === 0
                      ? "–"
                      : Math.min(...prices) === Math.max(...prices)
                        ? formatPrice(Math.min(...prices))
                        : `${formatPrice(Math.min(...prices))} – ${formatPrice(Math.max(...prices))}`}
                  </td>
                  <td className={td}>
                    {stock === 0 ? <span className="font-medium text-red-700">Out of stock</span> : stock}
                    <span className="block text-xs text-muted">{active.length} variant{active.length === 1 ? "" : "s"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="font-medium text-marine-700 underline">← Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="font-medium text-marine-700 underline">Next →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
