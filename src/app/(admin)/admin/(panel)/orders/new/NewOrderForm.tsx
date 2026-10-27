"use client";

import { useMemo, useState } from "react";
import { PendingProvider, SubmitButton, useServerAction } from "@/components/admin/forms";
import { Card, Field, inputClass, Notice } from "@/components/admin/ui";
import { formatPrice } from "@/lib/format";
import { createManualOrder } from "../actions";

export type PickVariant = {
  id: string;
  label: string;
  sku: string;
  price: number;
  stock: number;
};

type Line = { variantId: string; qty: number };

export function NewOrderForm({
  variants,
  zones,
}: {
  variants: PickVariant[];
  zones: { id: string; name: string; fee: number }[];
}) {
  const { state, onSubmit, pending } = useServerAction(createManualOrder);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [fields, setFields] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    zone_id: zones[0]?.id ?? "",
    payment: "cod",
    notes: "",
    code: "",
    source: "whatsapp",
  });
  const byId = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants]);
  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const matches = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return variants.filter((v) => words.every((w) => v.label.toLowerCase().includes(w) || v.sku.toLowerCase().includes(w))).slice(0, 8);
  }, [search, variants]);

  const subtotal = lines.reduce((n, l) => n + (byId.get(l.variantId)?.price ?? 0) * l.qty, 0);
  const zone = zones.find((z) => z.id === fields.zone_id);
  const payload = { ...fields, items: lines.map((l) => ({ variant_id: l.variantId, qty: l.qty })) };

  function add(v: PickVariant) {
    setLines((all) => {
      const existing = all.find((l) => l.variantId === v.id);
      if (existing) return all.map((l) => (l.variantId === v.id ? { ...l, qty: Math.min(l.qty + 1, Math.min(10, v.stock)) } : l));
      return [...all, { variantId: v.id, qty: 1 }];
    });
    setSearch("");
  }

  return (
    <PendingProvider pending={pending}>
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {state?.message && !state.ok && <Notice tone="red">{state.message}</Notice>}

      <Card title="Items" description="Search by product name, variant or SKU. Stock is reserved as soon as the order is saved.">
        <div className="relative">
          <label htmlFor="item-search" className="sr-only">Search products</label>
          <input id="item-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" autoComplete="off" className={`${inputClass} mt-0`} />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-white shadow-lg">
              {matches.map((v) => (
                <li key={v.id}>
                  <button type="button" disabled={v.stock <= 0} onClick={() => add(v)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50">
                    <span>
                      <span className="font-medium text-marine-900">{v.label}</span>
                      <span className="block text-xs text-muted">{v.sku}</span>
                    </span>
                    <span className="text-right text-xs">
                      <span className="block font-medium text-marine-900">{formatPrice(v.price)}</span>
                      <span className={v.stock <= 0 ? "text-danger-700" : "text-muted"}>{v.stock <= 0 ? "Out of stock" : `${v.stock} in stock`}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {lines.map((l) => {
              const v = byId.get(l.variantId);
              if (!v) return null;
              return (
                <li key={l.variantId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 basis-full flex-1 sm:basis-48">
                    <span className="font-medium text-marine-900">{v.label}</span>
                    <span className="block text-xs text-muted">{formatPrice(v.price)} each · {v.stock} in stock</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <label htmlFor={`qty-${l.variantId}`} className="sr-only">Quantity for {v.label}</label>
                    <input
                      id={`qty-${l.variantId}`}
                      type="number"
                      min={1}
                      max={Math.min(10, v.stock)}
                      value={l.qty}
                      onChange={(e) => setLines((all) => all.map((x) => (x.variantId === l.variantId ? { ...x, qty: Math.max(1, Math.min(Number(e.target.value) || 1, Math.min(10, v.stock))) } : x)))}
                      className="h-10 w-20 rounded-lg border border-line px-2 text-sm"
                    />
                    <button type="button" onClick={() => setLines((all) => all.filter((x) => x.variantId !== l.variantId))} className="text-xs text-danger-700 underline">
                      Remove
                    </button>
                  </span>
                  <span className="w-28 text-right font-medium">{formatPrice(v.price * l.qty)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">No items yet.</p>
        )}
      </Card>

      <Card title="Customer and delivery">
        <div className="grid gap-4 @min-[34rem]:grid-cols-2">
          <Field label="Full name" htmlFor="name"><input id="name" value={fields.name} onChange={set("name")} required className={inputClass} /></Field>
          <Field label="Phone number" htmlFor="phone"><input id="phone" type="tel" value={fields.phone} onChange={set("phone")} required className={inputClass} placeholder="08012345678" /></Field>
          <Field label="Email (optional)" htmlFor="email"><input id="email" type="email" value={fields.email} onChange={set("email")} className={inputClass} /></Field>
          <Field label="Delivery area" htmlFor="zone">
            <select id="zone" value={fields.zone_id} onChange={set("zone_id")} className={inputClass}>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name} · {formatPrice(z.fee)}</option>)}
            </select>
          </Field>
          <div className="@min-[34rem]:col-span-2">
            <Field label="Delivery address" htmlFor="address"><textarea id="address" value={fields.address} onChange={set("address")} rows={2} required className={`${inputClass} h-auto py-2.5`} /></Field>
          </div>
          <Field label="Payment" htmlFor="payment">
            <select id="payment" value={fields.payment} onChange={set("payment")} className={inputClass}>
              <option value="cod">Pay on delivery</option>
              <option value="transfer">Bank transfer</option>
            </select>
          </Field>
          <Field label="Where did the order come from?" htmlFor="source">
            <select id="source" value={fields.source} onChange={set("source")} className={inputClass}>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="phone">Phone call</option>
              <option value="walk-in">Walk-in</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Discount code (optional)" htmlFor="code"><input id="code" value={fields.code} onChange={set("code")} className={inputClass} /></Field>
          <Field label="Customer's note (optional)" htmlFor="notes"><input id="notes" value={fields.notes} onChange={set("notes")} maxLength={500} className={inputClass} /></Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5">
        <dl className="text-sm">
          <div className="flex gap-6"><dt className="text-muted">Items</dt><dd>{formatPrice(subtotal)}</dd></div>
          <div className="flex gap-6"><dt className="text-muted">Delivery</dt><dd>{formatPrice(zone?.fee ?? 0)}</dd></div>
          <div className="flex gap-6 text-base font-semibold text-marine-900"><dt>Total before any discount</dt><dd>{formatPrice(subtotal + (zone?.fee ?? 0))}</dd></div>
        </dl>
        <SubmitButton pendingText="Saving…">Save order</SubmitButton>
      </div>
    </form>
    </PendingProvider>
  );
}
