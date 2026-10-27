import Link from "next/link";
import { RevenueChart, type DayPoint } from "@/components/admin/charts";
import { BarList, RangeTabs, StatTile } from "@/components/admin/stats";
import { Card, Notice, PageHeader, StatusBadge, Table, td, th } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { dateTime } from "@/lib/admin/util";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

type Dashboard = {
  days: number;
  orders: number;
  booked_revenue: number;
  collected_revenue: number;
  average_order: number;
  awaiting_confirmation: number;
  awaiting_dispatch: number;
  out_for_delivery: number;
  daily: DayPoint[];
  top_products: { name: string; units: number; revenue: number }[];
  low_stock: { name: string; sku: string; stock: number; variant_label: string }[];
  recent_orders: { id: string; order_number: string; customer_name: string; total: number; status: string; payment_status: string; created_at: string }[];
};

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const staff = await requireStaff();
  const params = await searchParams;

  // Editors manage content only, so they get a short welcome instead of sales figures.
  if (staff.role === "editor") {
    return (
      <>
        <PageHeader title={`Welcome, ${staff.name}`} description="You can edit categories, spec fields and brands." />
        {params.denied && <Notice tone="gold">You don&apos;t have access to that page.</Notice>}
      </>
    );
  }

  const days = [7, 30, 90].includes(Number(params.days)) ? Number(params.days) : 30;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard", { p_days: days });
  if (error || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Notice tone="red">Couldn&apos;t load the dashboard. Refresh the page, and tell the developer if it keeps happening.</Notice>
      </>
    );
  }
  const d = data as Dashboard;

  return (
    <>
      <PageHeader title={`Hello, ${staff.name}`} description="How the shop is doing." />
      {params.denied && <Notice tone="gold">You don&apos;t have access to that page.</Notice>}

      <section aria-label="Needs attention" className="mb-6 grid gap-3 @min-[34rem]:grid-cols-2 @min-[54rem]:grid-cols-4">
        {[
          { label: "Waiting for you to confirm", value: d.awaiting_confirmation, href: "/admin/orders?status=pending" },
          { label: "Ready to pack or send", value: d.awaiting_dispatch, href: "/admin/orders?status=confirmed" },
          { label: "Out for delivery", value: d.out_for_delivery, href: "/admin/orders?status=out_for_delivery" },
          { label: "Variants running low", value: d.low_stock.length, href: "/admin/inventory?show=low" },
        ].map((t) => (
          <Link key={t.label} href={t.href} className="rounded-2xl border border-line bg-white p-4 hover:border-marine-700">
            <p className="text-2xl font-semibold text-marine-900">{t.value}</p>
            <p className="text-sm text-muted">{t.label}</p>
          </Link>
        ))}
      </section>

      <RangeTabs base="/admin" days={d.days} />

      <section aria-label="Key figures" className="mb-6 grid gap-4 @min-[34rem]:grid-cols-2 @min-[54rem]:grid-cols-4">
        <StatTile label="Orders" value={d.orders} hint={`Last ${d.days} days`} />
        <StatTile label="Sales" value={formatPrice(d.booked_revenue)} hint="Cancelled and refunded orders excluded" />
        <StatTile label="Money received" value={formatPrice(d.collected_revenue)} hint="Orders marked as paid" />
        <StatTile label="Average order" value={formatPrice(d.average_order)} />
      </section>

      <Card title="Sales per day" description="Each column is one day. Hover or tab to a column for the details.">
        <RevenueChart data={d.daily} title={`Sales per day, last ${d.days} days`} />
      </Card>

      <div className="mt-6 grid gap-6 @min-[48rem]:grid-cols-2">
        <Card title="Best sellers" description="By units sold in this period.">
          <BarList
            empty="No sales in this period yet."
            items={d.top_products.map((p) => ({
              label: p.name,
              value: p.units,
              display: `${p.units} sold`,
              sub: formatPrice(p.revenue),
            }))}
          />
        </Card>
        <Card title="Running low" description="Active variants at or below their low-stock level.">
          {d.low_stock.length === 0 ? (
            <p className="text-sm text-muted">Nothing is running low.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.low_stock.map((l) => (
                <li key={l.sku} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-marine-900">{l.name}</span>
                    <span className="block truncate text-xs text-muted">{[l.variant_label, l.sku].filter(Boolean).join(" · ")}</span>
                  </span>
                  <Link href={`/admin/inventory?q=${encodeURIComponent(l.sku)}`} className={`shrink-0 font-semibold underline ${l.stock === 0 ? "text-danger-700" : "text-marine-800"}`}>
                    {l.stock === 0 ? "Out" : `${l.stock} left`}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-base font-semibold text-marine-900">Latest orders</h2>
      {d.recent_orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">No orders yet.</p>
      ) : (
        <Table>
          <thead className="border-b border-line">
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Customer</th>
              <th className={th}>Total</th>
              <th className={th}>Payment</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {d.recent_orders.map((o) => (
              <tr key={o.id}>
                <td className={td}>
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-marine-800 underline">{o.order_number}</Link>
                  <span className="block text-xs text-muted">{dateTime.format(new Date(o.created_at))}</span>
                </td>
                <td className={td}>{o.customer_name}</td>
                <td className={td}>{formatPrice(o.total)}</td>
                <td className={td}><StatusBadge status={o.payment_status} /></td>
                <td className={td}><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
