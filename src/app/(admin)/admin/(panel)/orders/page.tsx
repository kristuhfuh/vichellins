import Link from "next/link";
import { buttonStyles, EmptyState, inputClass, LinkButton, PageHeader, StatusBadge, Table, td, th } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { dateTime } from "@/lib/admin/util";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Orders" };

const PAGE_SIZE = 25;
const STATUSES = ["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled", "refunded"];

type Row = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  zone_name: string;
  total: number;
  created_at: string;
  source: string | null;
  order_items: { qty: number }[];
};

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff(COMMERCE);
  const params = await searchParams;
  const status = typeof params.status === "string" && STATUSES.includes(params.status) ? params.status : "";
  const payment = typeof params.payment === "string" && ["unpaid", "paid", "failed", "refunded"].includes(params.payment) ? params.payment : "";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, payment_method, customer_name, customer_phone, zone_name, total, created_at, source, order_items(qty)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (payment) query = query.eq("payment_status", payment);
  if (q) {
    // Strip characters that have meaning inside a PostgREST filter list.
    const safe = q.replace(/[,()%*\\]/g, " ").trim();
    if (safe) query = query.or(`order_number.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%`);
  }

  const [{ data, count }, countsResult] = await Promise.all([
    query,
    supabase.from("orders").select("status"),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const counts: Record<string, number> = {};
  for (const r of countsResult.data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  const link = (over: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const base: Record<string, string> = { status, payment, q, page: page > 1 ? String(page) : "" };
    for (const [k, v] of Object.entries({ ...base, ...over })) if (v) next.set(k, v);
    const s = next.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${total} order${total === 1 ? "" : "s"}${status ? ` · ${status.replace(/_/g, " ")}` : ""}`}
        actions={<LinkButton href="/admin/orders/new" variant="primary">Record an order</LinkButton>}
      />

      <nav aria-label="Order status" className="mb-4 flex flex-wrap gap-2">
        {[["", `All (${all})`], ...STATUSES.map((s) => [s, `${s.replace(/_/g, " ")} (${counts[s] ?? 0})`])].map(([value, text]) => (
          <Link
            key={value || "all"}
            href={link({ status: value || undefined, page: undefined })}
            aria-current={status === value ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize ${status === value ? "bg-marine-700 text-white" : "bg-white text-marine-900 ring-1 ring-line hover:ring-marine-700"}`}
          >
            {text}
          </Link>
        ))}
      </nav>

      <form className="mb-5 flex flex-wrap items-end gap-3" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="min-w-0 basis-full flex-1 sm:basis-56">
          <label htmlFor="q" className="text-sm font-medium text-marine-900">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Order number, name or phone" className={inputClass} />
        </div>
        <div>
          <label htmlFor="payment" className="text-sm font-medium text-marine-900">Payment</label>
          <select id="payment" name="payment" defaultValue={payment} className={inputClass}>
            <option value="">Any</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <button type="submit" className={buttonStyles.secondary}>Search</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={q || status || payment ? "No orders match" : "No orders yet"}
          body={q || status || payment ? "Try a different search or clear the filters." : "Orders placed on the website, or recorded here, will appear in this list."}
        />
      ) : (
        <Table>
          <thead className="border-b border-line">
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Customer</th>
              <th className={th}>Area</th>
              <th className={th}>Total</th>
              <th className={th}>Payment</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((o) => {
              const items = o.order_items.reduce((n, i) => n + i.qty, 0);
              return (
                <tr key={o.id}>
                  <td className={td}>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-marine-800 underline">{o.order_number}</Link>
                    <span className="block text-xs text-muted">{dateTime.format(new Date(o.created_at))}{o.source ? ` · ${o.source}` : ""}</span>
                  </td>
                  <td className={td}>
                    {o.customer_name}
                    <span className="block text-xs text-muted">{o.customer_phone}</span>
                  </td>
                  <td className={td}>{o.zone_name}</td>
                  <td className={td}>
                    {formatPrice(o.total)}
                    <span className="block text-xs text-muted">{items} item{items === 1 ? "" : "s"}</span>
                  </td>
                  <td className={td}>
                    <StatusBadge status={o.payment_status} />
                    <span className="mt-1 block text-xs text-muted">{o.payment_method === "cod" ? "Pay on delivery" : o.payment_method}</span>
                  </td>
                  <td className={td}><StatusBadge status={o.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
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
