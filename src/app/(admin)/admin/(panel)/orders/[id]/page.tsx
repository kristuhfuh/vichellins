import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Notice, PageHeader, StatusBadge } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { dateTime, STATUS_FLOW, toWhatsApp } from "@/lib/admin/util";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { NotesForm, PaymentForm, StatusActions } from "./forms";

export const metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  await requireStaff(COMMERCE);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(id, name, variant_label, sku, unit_price, qty, warranty_months, warranty_type), order_events(id, status, note, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const flow = STATUS_FLOW[order.status] ?? { next: [], cancel: false };
  const items = [...order.order_items].sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
  const events = [...order.order_events].sort((a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at));
  const wa = toWhatsApp(order.customer_phone);

  return (
    <>
      <PageHeader
        title={`Order ${order.order_number}`}
        description={`Placed ${dateTime.format(new Date(order.created_at))}${order.source ? ` · via ${order.source}` : ""}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.payment_status} />
          </>
        }
      />
      {query.created === "1" && <Notice tone="green">Order recorded and stock reserved.</Notice>}

      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/orders" className="font-medium text-marine-700 underline">← All orders</Link>
        <Link href={`/admin/print/${order.id}?type=invoice`} target="_blank" className="font-medium text-marine-700 underline">Print invoice</Link>
        <Link href={`/admin/print/${order.id}?type=packing`} target="_blank" className="font-medium text-marine-700 underline">Print packing slip</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Items">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted">
                    <th className="pb-2 font-semibold">Item</th>
                    <th className="pb-2 text-right font-semibold">Price</th>
                    <th className="pb-2 text-right font-semibold">Qty</th>
                    <th className="pb-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((i: { id: string; name: string; variant_label: string; sku: string | null; unit_price: number; qty: number }) => (
                    <tr key={i.id}>
                      <td className="py-3">
                        <span className="font-medium text-marine-900">{i.name}</span>
                        <span className="block text-xs text-muted">{[i.variant_label, i.sku].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className="py-3 text-right">{formatPrice(i.unit_price)}</td>
                      <td className="py-3 text-right">{i.qty}</td>
                      <td className="py-3 text-right font-medium">{formatPrice(i.unit_price * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              {order.discount_total > 0 && (
                <div className="flex justify-between"><dt className="text-muted">Discount{order.discount_code ? ` (${order.discount_code})` : ""}</dt><dd>−{formatPrice(order.discount_total)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted">Delivery ({order.zone_name})</dt><dd>{formatPrice(order.delivery_fee)}</dd></div>
              <div className="flex justify-between text-base font-semibold text-marine-900"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
          </Card>

          <Card title="Timeline">
            <ol className="space-y-4">
              {events.map((e: { id: string; status: string; note: string | null; created_at: string }) => (
                <li key={e.id} className="flex gap-3">
                  <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-marine-700" />
                  <div>
                    <p className="text-sm font-medium capitalize text-marine-900">{e.status.replace(/_/g, " ")}</p>
                    {e.note && <p className="text-sm text-muted">{e.note}</p>}
                    <p className="text-xs text-muted">{dateTime.format(new Date(e.created_at))}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Update order">
            <StatusActions id={order.id} next={flow.next} canCancel={flow.cancel} isDelivered={order.status === "delivered"} />
          </Card>

          <Card title="Payment">
            <p className="mb-3 text-sm text-muted">
              {order.payment_method === "cod" ? "Pay on delivery" : order.payment_method === "transfer" ? "Bank transfer" : order.payment_method}
              {" · "}
              {formatPrice(order.total)}
            </p>
            <PaymentForm id={order.id} status={order.payment_status} locked={order.status === "cancelled" || order.status === "refunded"} />
          </Card>

          <Card title="Customer">
            <p className="font-medium text-marine-900">{order.customer_name}</p>
            <p className="mt-1 text-sm">
              <a href={`tel:${order.customer_phone}`} className="text-marine-700 underline">{order.customer_phone}</a>
              {" · "}
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="text-marine-700 underline">WhatsApp</a>
            </p>
            {order.customer_email && <p className="text-sm"><a href={`mailto:${order.customer_email}`} className="text-marine-700 underline">{order.customer_email}</a></p>}
            <h3 className="mt-4 text-sm font-semibold text-marine-900">Delivery address</h3>
            <p className="whitespace-pre-line text-sm text-muted">{order.address}</p>
            <p className="mt-1 text-sm text-muted">{order.zone_name}</p>
            {order.notes && (
              <>
                <h3 className="mt-4 text-sm font-semibold text-marine-900">Customer&apos;s note</h3>
                <p className="whitespace-pre-line text-sm text-muted">{order.notes}</p>
              </>
            )}
          </Card>

          <Card title="Staff notes">
            <NotesForm id={order.id} notes={order.internal_notes ?? ""} />
          </Card>
        </div>
      </div>
    </>
  );
}
