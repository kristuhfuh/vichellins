import { BarList, RangeTabs } from "@/components/admin/stats";
import { Card, Notice, PageHeader, Table, td, th } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Analytics" };

type Analytics = {
  days: number;
  funnel: { product_views: number; add_to_cart: number; checkout_start: number; orders: number; whatsapp_clicks: number };
  products: { id: string; name: string; views: number; carts: number; units: number }[];
  order_sources: { source: string; orders: number; revenue: number }[];
};

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–");

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireStaff(COMMERCE);
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params.days)) ? Number(params.days) : 30;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_analytics", { p_days: days });
  if (error || !data) {
    return (
      <>
        <PageHeader title="Analytics" />
        <Notice tone="red">Couldn&apos;t load analytics. Refresh the page, and tell the developer if it keeps happening.</Notice>
      </>
    );
  }
  const a = data as Analytics;
  const f = a.funnel;
  const noTracking = f.product_views + f.add_to_cart + f.checkout_start === 0;

  return (
    <>
      <PageHeader title="Analytics" description="What shoppers look at, and what they buy." />
      <RangeTabs base="/admin/analytics" days={a.days} />

      {noTracking && (
        <Notice tone="gold">
          No shopper activity has been recorded yet. Page views and add-to-cart events appear here once the website is connected to this database. Orders and sources below already count.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="From looking to buying" description="Each step is a count of events in this period, not of people.">
          <BarList
            empty="No activity yet."
            items={[
              { label: "Product page views", value: f.product_views, display: f.product_views.toLocaleString("en-NG") },
              { label: "Added to cart", value: f.add_to_cart, display: f.add_to_cart.toLocaleString("en-NG"), sub: `${pct(f.add_to_cart, f.product_views)} of views` },
              { label: "Started checkout", value: f.checkout_start, display: f.checkout_start.toLocaleString("en-NG"), sub: `${pct(f.checkout_start, f.add_to_cart)} of carts` },
              { label: "Orders placed", value: f.orders, display: f.orders.toLocaleString("en-NG"), sub: `${pct(f.orders, f.checkout_start)} of checkouts` },
            ]}
          />
          <p className="mt-4 text-sm text-muted">
            WhatsApp chat taps: <span className="font-semibold text-marine-900">{f.whatsapp_clicks.toLocaleString("en-NG")}</span>
          </p>
        </Card>

        <Card title="Where orders come from" description="Orders by the channel they arrived through.">
          <BarList
            empty="No orders in this period yet."
            items={a.order_sources.map((s) => ({
              label: s.source,
              value: s.orders,
              display: `${s.orders} order${s.orders === 1 ? "" : "s"}`,
              sub: formatPrice(s.revenue),
            }))}
          />
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-base font-semibold text-marine-900">Products: views against sales</h2>
      <p className="mb-3 max-w-2xl text-sm text-muted">
        A product with many views and no sales may need a better photo, price or description. One with few views but good sales deserves more promotion.
      </p>
      {a.products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">No published products yet.</p>
      ) : (
        <Table>
          <thead className="border-b border-line">
            <tr>
              <th className={th}>Product</th>
              <th className={`${th} text-right`}>Views</th>
              <th className={`${th} text-right`}>Added to cart</th>
              <th className={`${th} text-right`}>Units sold</th>
              <th className={`${th} text-right`}>Sold per view</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {a.products.map((p) => (
              <tr key={p.id}>
                <td className={td}>{p.name}</td>
                <td className={`${td} text-right tabular-nums`}>{p.views}</td>
                <td className={`${td} text-right tabular-nums`}>{p.carts}</td>
                <td className={`${td} text-right tabular-nums`}>{p.units}</td>
                <td className={`${td} text-right tabular-nums`}>{pct(p.units, p.views)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
