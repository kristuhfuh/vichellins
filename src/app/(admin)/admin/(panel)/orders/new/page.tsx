import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { loadOptionOrder, variantLabel } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";
import { NewOrderForm, type PickVariant } from "./NewOrderForm";

export const metadata = { title: "Record an order" };

export default async function NewOrderPage() {
  await requireStaff(COMMERCE);
  const supabase = await createClient();
  const [{ data: rows }, { data: zones }] = await Promise.all([
    supabase
      .from("variants")
      .select("id, sku, price, stock, option_values, product_id, product:products!inner(name, status)")
      .eq("is_active", true)
      .eq("product.status", "published")
      .order("sku"),
    supabase.from("delivery_zones").select("id, name, fee").eq("is_active", true).order("sort_order").order("name"),
  ]);

  const productIds = [...new Set((rows ?? []).map((r) => r.product_id as string))];
  const optionOrder = await loadOptionOrder(supabase, productIds);
  const variants: PickVariant[] = (rows ?? []).map((r) => {
    const product = r.product as unknown as { name: string };
    const label = variantLabel(r.option_values as Record<string, string>, optionOrder.get(r.product_id as string));
    return { id: r.id, sku: r.sku, price: r.price, stock: r.stock, label: label ? `${product.name} · ${label}` : product.name };
  });

  return (
    <>
      <PageHeader
        title="Record an order"
        description="For orders that arrive on WhatsApp, Instagram, by phone or in person. Prices and stock are checked when you save, so the order is handled exactly like a website order."
        actions={<Link href="/admin/orders" className="text-sm font-medium text-marine-700 underline">← All orders</Link>}
      />
      {(zones ?? []).length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm">
          Add at least one delivery area under <Link className="underline" href="/admin/delivery">Delivery zones</Link> first.
        </p>
      ) : variants.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm">
          There are no published products to order yet. Publish a product first.
        </p>
      ) : (
        <NewOrderForm variants={variants} zones={zones ?? []} />
      )}
    </>
  );
}
