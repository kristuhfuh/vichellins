import { notFound } from "next/navigation";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { dateTime } from "@/lib/admin/util";
import { store } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Print order" };

export default async function PrintOrderPage({ params, searchParams }: PageProps<"/admin/print/[id]">) {
  await requireStaff(COMMERCE);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const packing = query.type === "packing";

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(id, name, variant_label, sku, unit_price, qty, warranty_months, warranty_type)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();
  const items = [...order.order_items].sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-black print:p-0">
      <div className="mb-6 flex items-start justify-between print:hidden">
        <p className="text-muted">{packing ? "Packing slip" : "Invoice"} preview</p>
        <PrintButton />
      </div>

      <header className="flex items-start justify-between border-b border-black pb-4">
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p>{store.location}</p>
          <p>{store.phoneDisplay} · {store.email}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">{packing ? "PACKING SLIP" : "INVOICE"}</p>
          <p className="font-mono">{order.order_number}</p>
          <p>{dateTime.format(new Date(order.created_at))}</p>
        </div>
      </header>

      <section className="my-5 grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold">{packing ? "Deliver to" : "Billed to"}</h2>
          <p>{order.customer_name}</p>
          <p>{order.customer_phone}</p>
          {!packing && order.customer_email && <p>{order.customer_email}</p>}
          <p className="whitespace-pre-line">{order.address}</p>
          <p>{order.zone_name}</p>
        </div>
        <div className="text-right">
          {!packing && (
            <>
              <h2 className="font-semibold">Payment</h2>
              <p>{order.payment_method === "cod" ? "Pay on delivery" : "Bank transfer"}</p>
              <p className="capitalize">{order.payment_status}</p>
            </>
          )}
          {packing && order.payment_method === "cod" && (
            <p className="rounded border-2 border-black p-2 text-center text-base font-bold">COLLECT {formatPrice(order.total)}</p>
          )}
        </div>
      </section>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-black">
            {packing && <th className="w-8 py-2" aria-label="Packed"></th>}
            <th className="py-2">Item</th>
            <th className="py-2">SKU</th>
            <th className="py-2 text-right">Qty</th>
            {!packing && <th className="py-2 text-right">Price</th>}
            {!packing && <th className="py-2 text-right">Total</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((i: { id: string; name: string; variant_label: string; sku: string | null; unit_price: number; qty: number; warranty_months: number; warranty_type: string }) => (
            <tr key={i.id} className="border-b border-neutral-300">
              {packing && <td className="py-2"><span className="inline-block h-4 w-4 border border-black" /></td>}
              <td className="py-2">
                {i.name}
                {i.variant_label && <span className="block text-xs">{i.variant_label}</span>}
                {!packing && i.warranty_months > 0 && <span className="block text-xs">{i.warranty_months} month {i.warranty_type} warranty</span>}
              </td>
              <td className="py-2 font-mono text-xs">{i.sku}</td>
              <td className="py-2 text-right">{i.qty}</td>
              {!packing && <td className="py-2 text-right">{formatPrice(i.unit_price)}</td>}
              {!packing && <td className="py-2 text-right">{formatPrice(i.unit_price * i.qty)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {!packing && (
        <dl className="ml-auto mt-4 w-64 space-y-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          {order.discount_total > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{formatPrice(order.discount_total)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{formatPrice(order.delivery_fee)}</dd></div>
          <div className="flex justify-between border-t border-black pt-1 text-base font-bold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      )}

      {order.notes && (
        <section className="mt-6">
          <h2 className="font-semibold">Customer&apos;s note</h2>
          <p className="whitespace-pre-line">{order.notes}</p>
        </section>
      )}
      <footer className="mt-10 border-t border-neutral-300 pt-3 text-xs">
        Thank you for shopping with {store.name}. Keep this document for warranty claims.
      </footer>
    </div>
  );
}
