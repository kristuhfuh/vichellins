"use client";

import Link from "next/link";
import { useState } from "react";
import { clearCart, useCart } from "@/lib/cart-store";
import { deliveryZones, paymentMethods, whatsappLink } from "@/lib/config";
import { formatPrice } from "@/lib/format";

type Fields = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  zone: string;
  payment: string;
};

const initial: Fields = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  zone: deliveryZones[0].id,
  payment: paymentMethods[0].id,
};

const input =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-marine-900 focus:border-marine-700 focus:outline-none aria-[invalid=true]:border-danger-700";

function validate(f: Fields) {
  const errors: Partial<Record<keyof Fields, string>> = {};
  if (f.name.trim().length < 2) errors.name = "Enter your full name.";
  // Nigerian mobile numbers: 11 digits starting 0, or +234 / 234 followed by 10 digits.
  if (!/^(?:\+?234|0)[789][01]\d{8}$/.test(f.phone.replace(/[\s-]/g, ""))) {
    errors.phone = "Enter a valid Nigerian phone number, e.g. 08012345678.";
  }
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) errors.email = "Enter a valid email or leave it blank.";
  if (f.address.trim().length < 8) errors.address = "Enter your full delivery address, with street and area.";
  return errors;
}

export default function CheckoutPage() {
  const { items, subtotal } = useCart();
  const [fields, setFields] = useState<Fields>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [sent, setSent] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const zone = deliveryZones.find((z) => z.id === fields.zone) ?? deliveryZones[0];
  const payment = paymentMethods.find((p) => p.id === fields.payment) ?? paymentMethods[0];
  const total = subtotal + zone.fee;

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  if (sent) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-marine-900">Almost done — just press send</h1>
        <p className="mt-3 text-muted">
          WhatsApp has opened with your order ready. Hit send there and we&apos;ll confirm stock and arrange delivery — usually within a few minutes.
        </p>
        <a href={sent} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-12 items-center rounded-full bg-marine-700 px-7 text-sm font-semibold text-white hover:bg-marine-800">
          Open WhatsApp again
        </a>
        <p className="mt-4 text-xs text-muted">
          Your order is only placed once you send the message in WhatsApp.{" "}
          {confirmClear ? (
            <>
              Clear your cart?{" "}
              <button
                type="button"
                className="underline"
                onClick={() => { clearCart(); setSent(null); }}
              >
                Yes, clear it
              </button>
              {" · "}
              <button type="button" className="underline" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="underline" onClick={() => setConfirmClear(true)}>
              Clear my cart
            </button>
          )}
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-marine-900">Nothing to check out</h1>
        <p className="mt-3 text-muted">Your cart is empty.</p>
        <Link href="/shop" className="mt-6 inline-flex h-12 items-center rounded-full bg-marine-700 px-7 text-sm font-semibold text-white hover:bg-marine-800">
          Browse the shop
        </Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    const lines = items.map(
      (i) => `• ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} x${i.qty} - ${formatPrice(i.price * i.qty)}`,
    );
    const message = [
      "New order from the website",
      "",
      ...lines,
      "",
      `Subtotal: ${formatPrice(subtotal)}`,
      `Delivery (${zone.name}): ${formatPrice(zone.fee)}`,
      `Total: ${formatPrice(total)}`,
      "",
      `Payment: ${payment.label}`,
      `Name: ${fields.name.trim()}`,
      `Phone: ${fields.phone.trim()}`,
      ...(fields.email.trim() ? [`Email: ${fields.email.trim()}`] : []),
      `Address: ${fields.address.trim()}`,
      ...(fields.notes.trim() ? [`Notes: ${fields.notes.trim()}`] : []),
    ].join("\n");
    const url = whatsappLink(message);
    setSent(url);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const err = (key: keyof Fields) =>
    errors[key] ? (
      <p id={`e-${key}`} className="mt-1 text-xs text-danger-700">{errors[key]}</p>
    ) : null;
  const aria = (key: keyof Fields) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `e-${key}` : undefined,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-marine-900">Checkout</h1>
      <p className="mt-2 text-sm text-muted">Delivery within Lagos only. No account needed.</p>

      <form onSubmit={submit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-marine-900">Your details</legend>
            <div>
              <label htmlFor="f-name" className="text-sm font-medium text-marine-900">Full name</label>
              <input id="f-name" autoComplete="name" value={fields.name} onChange={set("name")} className={input} {...aria("name")} />
              {err("name")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-phone" className="text-sm font-medium text-marine-900">Phone number</label>
                <input id="f-phone" type="tel" autoComplete="tel" inputMode="tel" value={fields.phone} onChange={set("phone")} className={input} {...aria("phone")} />
                {err("phone")}
              </div>
              <div>
                <label htmlFor="f-email" className="text-sm font-medium text-marine-900">Email <span className="font-normal text-muted">(optional)</span></label>
                <input id="f-email" type="email" autoComplete="email" value={fields.email} onChange={set("email")} className={input} {...aria("email")} />
                {err("email")}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-marine-900">Delivery</legend>
            <div>
              <label htmlFor="f-zone" className="text-sm font-medium text-marine-900">Area</label>
              <select id="f-zone" value={fields.zone} onChange={set("zone")} className={input}>
                {deliveryZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} · {formatPrice(z.fee)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">Usually {zone.eta.toLowerCase()}.</p>
            </div>
            <div>
              <label htmlFor="f-address" className="text-sm font-medium text-marine-900">Delivery address</label>
              <textarea id="f-address" rows={3} autoComplete="street-address" value={fields.address} onChange={set("address")} className={`${input} h-auto py-3`} {...aria("address")} />
              {err("address")}
            </div>
            <div>
              <label htmlFor="f-notes" className="text-sm font-medium text-marine-900">Note for us <span className="font-normal text-muted">(optional)</span></label>
              <textarea id="f-notes" rows={2} value={fields.notes} onChange={set("notes")} className={`${input} h-auto py-3`} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-lg font-semibold text-marine-900">Payment</legend>
            <div className="mt-3 space-y-2">
              {paymentMethods.map((p) => (
                <label key={p.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${fields.payment === p.id ? "border-marine-700 bg-marine-50" : "border-line"}`}>
                  <input type="radio" name="payment" value={p.id} checked={fields.payment === p.id} onChange={set("payment")} className="mt-1 accent-marine-700" />
                  <span>
                    <span className="block text-sm font-semibold text-marine-900">{p.label}</span>
                    <span className="block text-xs text-muted">{p.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="h-fit rounded-3xl bg-surface p-6">
          <h2 className="text-lg font-semibold text-marine-900">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((i) => (
              <li key={i.variantId} className="flex justify-between gap-4">
                <span className="text-marine-900">
                  {i.name} <span className="text-muted">x{i.qty}</span>
                  {i.variantLabel && <span className="block text-xs text-muted">{i.variantLabel}</span>}
                </span>
                <span className="shrink-0 font-medium text-marine-900">{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{formatPrice(zone.fee)}</dd></div>
            <div className="flex justify-between text-base font-semibold text-marine-900"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
          </dl>
          <button type="submit" className="mt-6 h-12 w-full rounded-full bg-marine-700 text-sm font-semibold text-white hover:bg-marine-800">
            Send order on WhatsApp
          </button>
          <p className="mt-3 text-xs text-muted">
            This opens WhatsApp with your order pre-filled. We confirm stock and payment details — usually within a few minutes.
          </p>
          <Link href="/cart" className="mt-3 block text-center text-xs text-muted underline">Edit cart</Link>
        </aside>
      </form>
    </div>
  );
}
