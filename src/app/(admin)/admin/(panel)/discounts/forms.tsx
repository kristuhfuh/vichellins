"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field, inputClass } from "@/components/admin/ui";
import { createDiscount, deleteDiscount, updateDiscount } from "./actions";

export type Discount = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  used_count: number;
  starts: string;
  ends: string;
  is_active: boolean;
};

function Fields({ d, prefix }: { d?: Discount; prefix: string }) {
  const [kind, setKind] = useState(d?.kind ?? "percent");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {!d && (
        <Field label="Code" htmlFor={`${prefix}-code`} hint="Shoppers type this at checkout, e.g. WELCOME10.">
          <input id={`${prefix}-code`} name="code" required maxLength={24} className={`${inputClass} uppercase`} />
        </Field>
      )}
      <Field label="Type" htmlFor={`${prefix}-kind`}>
        <select id={`${prefix}-kind`} name="kind" value={kind} onChange={(e) => setKind(e.target.value as "percent" | "fixed")} className={inputClass}>
          <option value="percent">Percentage off</option>
          <option value="fixed">Fixed amount off (₦)</option>
        </select>
      </Field>
      <Field label={kind === "percent" ? "Percent off (1–100)" : "Amount off (₦)"} htmlFor={`${prefix}-value`}>
        <input id={`${prefix}-value`} name="value" type="number" min={1} max={kind === "percent" ? 100 : undefined} defaultValue={d?.value} required className={inputClass} />
      </Field>
      <Field label="Minimum order (₦)" htmlFor={`${prefix}-min`} hint="0 means no minimum.">
        <input id={`${prefix}-min`} name="min_subtotal" inputMode="numeric" defaultValue={d?.min_subtotal ?? 0} className={inputClass} />
      </Field>
      <Field label="Total uses allowed" htmlFor={`${prefix}-max`} hint="Leave blank for unlimited.">
        <input id={`${prefix}-max`} name="max_uses" type="number" min={1} defaultValue={d?.max_uses ?? ""} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" htmlFor={`${prefix}-starts`}>
          <input id={`${prefix}-starts`} name="starts" type="date" defaultValue={d?.starts} className={inputClass} />
        </Field>
        <Field label="Ends" htmlFor={`${prefix}-ends`}>
          <input id={`${prefix}-ends`} name="ends" type="date" defaultValue={d?.ends} className={inputClass} />
        </Field>
      </div>
    </div>
  );
}

export function AddDiscountForm() {
  return (
    <ActionForm action={createDiscount} resetOnSuccess className="space-y-4">
      <Fields prefix="new-discount" />
      <SubmitButton pendingText="Creating…">Create code</SubmitButton>
    </ActionForm>
  );
}

export function DiscountRow({ d }: { d: Discount }) {
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span className="font-mono text-base font-semibold text-marine-900">{d.code}</span>
          <span className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>{d.kind === "percent" ? `${d.value}% off` : `₦${d.value.toLocaleString("en-NG")} off`}</span>
            <span>{d.used_count}{d.max_uses ? ` / ${d.max_uses}` : ""} used</span>
            <span className={d.is_active ? "font-medium text-emerald-700" : "font-medium text-muted"}>{d.is_active ? "Active" : "Off"}</span>
            <span className="underline">Edit</span>
          </span>
        </summary>
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <ActionForm action={updateDiscount} className="space-y-4">
            <input type="hidden" name="id" value={d.id} />
            <Fields d={d} prefix={`d-${d.id}`} />
            <label className="flex items-center gap-2.5 text-sm text-marine-900">
              <input type="checkbox" name="is_active" defaultChecked={d.is_active} className="h-4 w-4 accent-marine-700" />
              Code can be used
            </label>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteDiscount}>
            <input type="hidden" name="id" value={d.id} />
            <SubmitButton variant="danger" pendingText="Deleting…" confirm={`Delete ${d.code}? Past orders keep their discount.`}>Delete code</SubmitButton>
          </ActionForm>
        </div>
      </details>
    </li>
  );
}
