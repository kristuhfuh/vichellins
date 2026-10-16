"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { addToCart } from "@/lib/cart-store";
import { whatsappLink } from "@/lib/config";
import { formatPrice, swatches } from "@/lib/format";
import type { Product, ProductKind } from "@/lib/types";
import { ProductVisual } from "./ProductVisual";

function matching(product: Product, selection: Record<string, string>) {
  return product.variants.find((v) =>
    product.options.every((o) => v.optionValues[o.name] === selection[o.name]),
  );
}

export function ProductPurchase({
  product,
  kind,
  children,
}: {
  product: Product;
  kind: ProductKind;
  children?: ReactNode;
}) {
  const router = useRouter();
  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [selection, setSelection] = useState<Record<string, string>>(firstAvailable.optionValues);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const variant = useMemo(() => matching(product, selection), [product, selection]);
  const colour = selection["Colour"];
  const tone = (colour && swatches[colour]) || product.tone;
  const soldOut = !variant || variant.stock <= 0;
  const maxQty = variant ? Math.min(variant.stock, 10) : 1;
  const safeQty = Math.min(qty, Math.max(maxQty, 1));
  const label = variant ? Object.values(variant.optionValues).join(" / ") : "";

  /** Whether choosing `value` for `option` leads to any in-stock variant, given the other current picks. */
  function optionAvailable(option: string, value: string) {
    return product.variants.some(
      (v) =>
        v.stock > 0 &&
        v.optionValues[option] === value &&
        product.options.every((o) => o.name === option || v.optionValues[o.name] === selection[o.name]),
    );
  }

  function pick(option: string, value: string) {
    const next = { ...selection, [option]: value };
    if (!matching(product, next)) {
      // The new pick has no variant with the other current choices; fall back to one that exists.
      const fallback =
        product.variants.find((v) => v.stock > 0 && v.optionValues[option] === value) ??
        product.variants.find((v) => v.optionValues[option] === value);
      if (fallback) {
        setSelection(fallback.optionValues);
        setQty(1);
        return;
      }
    }
    setSelection(next);
    setQty(1);
  }

  function add() {
    if (!variant || soldOut) return false;
    addToCart(
      {
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        variantLabel: label,
        price: variant.price,
        maxQty: variant.stock,
        kind,
        tone,
      },
      safeQty,
    );
    return true;
  }

  const enquiry = whatsappLink(
    `Hello, I'm interested in the ${product.name}${label ? ` (${label})` : ""}. Is it available?`,
  );

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-surface">
        <ProductVisual kind={kind} tone={tone} className="h-full w-full p-12" />
        <p className="absolute bottom-3 left-4 text-[11px] text-muted">Illustration. Photos coming soon.</p>
      </div>

      <div>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-semibold tracking-tight text-marine-900">
            {variant ? formatPrice(variant.price) : "Unavailable"}
          </p>
          {variant?.compareAtPrice && variant.compareAtPrice > variant.price && (
            <>
              <p className="text-base text-muted line-through">{formatPrice(variant.compareAtPrice)}</p>
              <span className="rounded-full bg-gold-400 px-2.5 py-1 text-xs font-semibold text-marine-900">
                Save {formatPrice(variant.compareAtPrice - variant.price)}
              </span>
            </>
          )}
        </div>

        <p className={`mt-2 text-sm font-medium ${soldOut ? "text-red-700" : variant && variant.stock <= 3 ? "text-gold-700" : "text-emerald-700"}`}>
          {soldOut
            ? "Out of stock"
            : variant && variant.stock <= 3
              ? `Only ${variant.stock} left`
              : "In stock"}
        </p>

        {product.options.map((option) => (
          <fieldset key={option.name} className="mt-6">
            <legend className="text-sm font-medium text-marine-900">
              {option.name}: <span className="font-normal text-muted">{selection[option.name]}</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const selected = selection[option.name] === value;
                const available = optionAvailable(option.name, value);
                const swatch = option.name === "Colour" ? swatches[value] : undefined;
                return (
                  <label
                    key={value}
                    className={`relative flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-500 ${selected ? "border-marine-700 bg-marine-50 font-semibold text-marine-800" : "border-line text-marine-900 hover:border-marine-300"} ${available ? "" : "opacity-50"}`}
                  >
                    <input
                      type="radio"
                      name={option.name}
                      value={value}
                      checked={selected}
                      onChange={() => pick(option.name, value)}
                      className="sr-only"
                    />
                    {swatch && <span className="h-4 w-4 rounded-full border border-black/15" style={{ background: swatch }} aria-hidden="true" />}
                    <span className={available ? "" : "line-through"}>{value}</span>
                    {!available && <span className="sr-only"> (out of stock)</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex h-12 items-center rounded-full border border-line" role="group" aria-label="Quantity">
            <button type="button" onClick={() => setQty(Math.max(1, safeQty - 1))} disabled={soldOut || safeQty <= 1} aria-label="Decrease quantity" className="h-12 w-11 text-lg text-marine-900 disabled:opacity-30">−</button>
            <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{safeQty}</span>
            <button type="button" onClick={() => setQty(Math.min(maxQty, safeQty + 1))} disabled={soldOut || safeQty >= maxQty} aria-label="Increase quantity" className="h-12 w-11 text-lg text-marine-900 disabled:opacity-30">+</button>
          </div>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => {
              if (!add()) return;
              setAdded(true);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => setAdded(false), 1800);
            }}
            className="h-12 flex-1 rounded-full border border-marine-700 px-6 text-sm font-semibold text-marine-800 hover:bg-marine-50 disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent"
          >
            <span aria-live="polite">{added ? "Added to cart ✓" : "Add to cart"}</span>
          </button>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => {
              if (add()) router.push("/checkout");
            }}
            className="h-12 flex-1 rounded-full bg-marine-700 px-6 text-sm font-semibold text-white hover:bg-marine-800 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            Buy now
          </button>
        </div>

        <a href={enquiry} target="_blank" rel="noopener noreferrer" className="mt-3 flex h-12 items-center justify-center rounded-full border border-line text-sm font-semibold text-marine-900 hover:border-marine-700">
          {soldOut ? "Ask when it's back in stock" : "Ask about this on WhatsApp"}
        </a>
        {children}
      </div>
    </div>
  );
}
