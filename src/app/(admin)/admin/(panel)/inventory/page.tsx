import Link from "next/link";
import { Badge, buttonStyles, EmptyState, inputClass, PageHeader } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { loadOptionOrder, variantLabel } from "@/lib/admin/queries";
import { dateTime } from "@/lib/admin/util";
import { createClient } from "@/lib/supabase/server";
import { AdjustForm } from "./AdjustForm";

export const metadata = { title: "Inventory" };

const PAGE_SIZE = 25;
const reasons: Record<string, string> = {
  sale: "Sold",
  restock: "Restocked",
  correction: "Corrected",
  return: "Returned",
  cancel: "Order cancelled",
};

type VariantRow = {
  id: string;
  sku: string;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  option_values: Record<string, string>;
  product_id: string;
  product: { name: string; status: string };
};

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  await requireStaff(COMMERCE);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const filter = typeof params.show === "string" ? params.show : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("variants")
    .select("id, sku, stock, low_stock_threshold, is_active, option_values, product_id, product:products!inner(name, status)")
    .neq("product.status", "archived")
    .order("stock")
    .limit(1000);

  if (q) {
    const safe = q.replace(/[,()%*\\]/g, " ").trim();
    if (safe) {
      const { data: named } = await supabase.from("products").select("id").ilike("name", `%${safe}%`).limit(200);
      const ids = (named ?? []).map((p) => p.id);
      query = query.or(`sku.ilike.%${safe}%${ids.length ? `,product_id.in.(${ids.join(",")})` : ""}`);
    }
  }
  const { data } = await query;
  let rows = (data ?? []) as unknown as VariantRow[];
  const lowCount = rows.filter((r) => r.is_active && r.stock <= r.low_stock_threshold).length;
  if (filter === "low") rows = rows.filter((r) => r.is_active && r.stock <= r.low_stock_threshold);
  if (filter === "out") rows = rows.filter((r) => r.is_active && r.stock === 0);

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [optionOrder, movementsResult] = await Promise.all([
    loadOptionOrder(supabase, [...new Set(shown.map((r) => r.product_id))]),
    shown.length
      ? supabase
          .from("inventory_movements")
          .select("variant_id, delta, reason, note, created_at, order_id")
          .in("variant_id", shown.map((r) => r.id))
          .order("created_at", { ascending: false })
          .limit(600)
      : Promise.resolve({ data: [] }),
  ]);
  const history = new Map<string, { delta: number; reason: string; note: string | null; created_at: string }[]>();
  for (const m of movementsResult.data ?? []) {
    const list = history.get(m.variant_id) ?? [];
    if (list.length < 6) list.push(m);
    history.set(m.variant_id, list);
  }

  const link = (over: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, show: filter, ...over })) if (v) next.set(k, v);
    const s = next.toString();
    return `/admin/inventory${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Every stock change is logged with who made it and why. Sales and cancellations adjust stock automatically."
      />

      <nav aria-label="Stock filter" className="mb-4 flex flex-wrap gap-2">
        {[["", "All"], ["low", `Low stock (${lowCount})`], ["out", "Out of stock"]].map(([value, text]) => (
          <Link key={value || "all"} href={link({ show: value || undefined, page: undefined })} aria-current={filter === value ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${filter === value ? "bg-marine-700 text-white" : "bg-white text-marine-900 ring-1 ring-line hover:ring-marine-700"}`}>
            {text}
          </Link>
        ))}
      </nav>

      <form className="mb-5 flex flex-wrap items-end gap-3" role="search">
        {filter && <input type="hidden" name="show" value={filter} />}
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="text-sm font-medium text-marine-900">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Product name or SKU" className={inputClass} />
        </div>
        <button type="submit" className={buttonStyles.secondary}>Search</button>
      </form>

      {shown.length === 0 ? (
        <EmptyState title="Nothing to show" body={q || filter ? "Try a different search or filter." : "Add products with variants and they will appear here."} />
      ) : (
        <ul className="space-y-3">
          {shown.map((v) => {
            const label = variantLabel(v.option_values, optionOrder.get(v.product_id));
            const out = v.stock === 0;
            const low = !out && v.stock <= v.low_stock_threshold;
            const moves = history.get(v.id) ?? [];
            return (
              <li key={v.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/admin/products/${v.product_id}`} className="font-semibold text-marine-900 hover:underline">{v.product.name}</Link>
                    {label && <span className="text-marine-900"> · {label}</span>}
                    <p className="text-xs text-muted">{v.sku}{!v.is_active && " · inactive"}{v.product.status === "draft" && " · draft product"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {out ? <Badge tone="red">Out of stock</Badge> : low ? <Badge tone="gold">Low</Badge> : null}
                    <span className="text-2xl font-semibold tabular-nums text-marine-900" aria-label={`${v.stock} in stock`}>{v.stock}</span>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-marine-700">Adjust stock and history</summary>
                  <div className="mt-4 space-y-4 border-t border-line pt-4">
                    <AdjustForm variantId={v.id} />
                    {moves.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Recent changes</h3>
                        <ul className="mt-2 space-y-1 text-sm">
                          {moves.map((m, i) => (
                            <li key={i} className="flex flex-wrap gap-x-3 text-marine-900">
                              <span className={`w-12 font-semibold tabular-nums ${m.delta < 0 ? "text-red-700" : "text-emerald-700"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                              <span>{reasons[m.reason] ?? m.reason}{m.note ? ` · ${m.note}` : ""}</span>
                              <span className="text-xs text-muted">{dateTime.format(new Date(m.created_at))}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link({ page: page - 1 === 1 ? undefined : String(page - 1) })} className="font-medium text-marine-700 underline">← Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={link({ page: String(page + 1) })} className="font-medium text-marine-700 underline">Next →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
