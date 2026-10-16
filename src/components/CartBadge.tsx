"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-store";

export function CartBadge() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-marine-900 hover:bg-surface"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h7.7a1.5 1.5 0 0 0 1.5-1.1L20 8H6.2" />
        <circle cx="9.5" cy="20" r="1.2" />
        <circle cx="17" cy="20" r="1.2" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-400 px-1 text-[11px] font-bold text-marine-900">
          {count}
        </span>
      )}
    </Link>
  );
}
