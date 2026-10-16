"use client";

import Link from "next/link";
import { ProductVisual } from "@/components/ProductVisual";
import { removeFromCart, setQty, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, count } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-marine-900">Your cart is empty</h1>
        <p className="mt-3 text-muted">Add something you like and it will wait for you here.</p>
        <Link href="/shop" className="mt-6 inline-flex h-12 items-center rounded-full bg-marine-700 px-7 text-sm font-semibold text-white hover:bg-marine-800">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-marine-900">
        Your cart <span className="text-lg font-normal text-muted">({count} item{count === 1 ? "" : "s"})</span>
      </h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={item.variantId} className="flex gap-4 py-5">
              <Link href={`/product/${item.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface">
                <ProductVisual kind={item.kind} tone={item.tone} className="h-full w-full p-3" />
              </Link>
              <div className="flex flex-1 flex-col justify-between sm:flex-row">
                <div>
                  <Link href={`/product/${item.slug}`} className="font-semibold text-marine-900 hover:underline">
                    {item.name}
                  </Link>
                  {item.variantLabel && <p className="mt-0.5 text-sm text-muted">{item.variantLabel}</p>}
                  <p className="mt-1 text-sm text-marine-900">{formatPrice(item.price)}</p>
                </div>
                <div className="mt-3 flex items-center gap-4 sm:mt-0 sm:flex-col sm:items-end sm:gap-3">
                  <div className="flex h-10 items-center rounded-full border border-line" role="group" aria-label={`Quantity for ${item.name}`}>
                    <button type="button" onClick={() => setQty(item.variantId, item.qty - 1)} aria-label="Decrease quantity" className="h-10 w-9 text-marine-900">−</button>
                    <span className="w-7 text-center text-sm font-semibold">{item.qty}</span>
                    <button type="button" onClick={() => setQty(item.variantId, item.qty + 1)} disabled={item.qty >= item.maxQty} aria-label="Increase quantity" className="h-10 w-9 text-marine-900 disabled:opacity-30">+</button>
                  </div>
                  <p className="text-sm font-semibold text-marine-900">{formatPrice(item.price * item.qty)}</p>
                  <button type="button" onClick={() => removeFromCart(item.variantId)} className="text-xs text-muted underline hover:text-marine-900">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-3xl bg-surface p-6">
          <h2 className="text-lg font-semibold text-marine-900">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium text-marine-900">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="text-muted">Chosen at checkout</dd>
            </div>
          </dl>
          <Link href="/checkout" className="mt-6 flex h-12 items-center justify-center rounded-full bg-marine-700 text-sm font-semibold text-white hover:bg-marine-800">
            Checkout
          </Link>
          <Link href="/shop" className="mt-3 flex h-12 items-center justify-center rounded-full border border-line bg-white text-sm font-semibold text-marine-900 hover:border-marine-700">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
