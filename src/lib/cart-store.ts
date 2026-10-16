"use client";

import { useSyncExternalStore } from "react";
import type { ProductKind } from "./types";

export type CartItem = {
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  price: number;
  qty: number;
  maxQty: number;
  kind: ProductKind;
  tone: string;
};

const KEY = "vn-cart-v1";
const EMPTY: CartItem[] = [];

let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    items = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    items = EMPTY;
  }
}

function commit(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: the cart still works for this tab.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return items;
}

export function addToCart(item: Omit<CartItem, "qty">, qty = 1) {
  load();
  const existing = items.find((i) => i.variantId === item.variantId);
  if (existing) {
    commit(
      items.map((i) =>
        i.variantId === item.variantId
          ? { ...i, ...item, qty: Math.min(i.qty + qty, item.maxQty) }
          : i,
      ),
    );
  } else {
    commit([...items, { ...item, qty: Math.min(qty, item.maxQty) }]);
  }
}

export function setQty(variantId: string, qty: number) {
  load();
  if (qty <= 0) return removeFromCart(variantId);
  commit(items.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(qty, i.maxQty) } : i)));
}

export function removeFromCart(variantId: string) {
  load();
  commit(items.filter((i) => i.variantId !== variantId));
}

export function clearCart() {
  commit(EMPTY);
}

export function useCart() {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const count = list.reduce((n, i) => n + i.qty, 0);
  const subtotal = list.reduce((n, i) => n + i.qty * i.price, 0);
  return { items: list, count, subtotal };
}
