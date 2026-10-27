"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addToCart, type CartItem } from "@/lib/cart-store";

const base =
  "inline-flex min-h-11 min-w-0 flex-1 basis-24 items-center justify-center rounded-full px-3 py-2 text-center text-sm font-semibold transition-colors";

/**
 * Card buttons. A single-variant product can be added straight from the card;
 * anything with options sends the shopper to the product page to choose.
 */
export function CardActions({
  href,
  item,
  soldOut,
}: {
  href: string;
  item: Omit<CartItem, "qty"> | null;
  soldOut: boolean;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (soldOut) {
    return (
      <Link href={href} className={`${base} w-full border border-line bg-surface text-muted`}>
        Sold out, view details
      </Link>
    );
  }

  if (!item) {
    return (
      <>
        <Link href={href} className={`${base} border border-line bg-white text-marine-900 hover:border-marine-700`}>
          Choose options
        </Link>
        <Link href={href} className={`${base} bg-marine-700 text-white hover:bg-marine-800`}>
          Buy now
        </Link>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          addToCart(item);
          setAdded(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setAdded(false), 1600);
        }}
        className={`${base} border border-line bg-white text-marine-900 hover:border-marine-700`}
      >
        <span aria-live="polite">{added ? "Added ✓" : "Add to cart"}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          addToCart(item);
          router.push("/checkout");
        }}
        className={`${base} bg-marine-700 text-white hover:bg-marine-800`}
      >
        Buy now
      </button>
    </>
  );
}
