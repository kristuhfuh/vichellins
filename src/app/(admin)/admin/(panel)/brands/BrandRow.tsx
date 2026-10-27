"use client";

import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { inputClass } from "@/components/admin/ui";
import { deleteBrand, updateBrand } from "./actions";

export function BrandRow({ id, name, productCount }: { id: string; name: string; productCount: number }) {
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <ActionForm action={updateBrand} className="flex flex-1 flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <div className="min-w-0 basis-full flex-1 sm:basis-48">
            <label htmlFor={`brand-${id}`} className="sr-only">
              Brand name
            </label>
            <input id={`brand-${id}`} name="name" defaultValue={name} required className={`${inputClass} mt-0`} />
          </div>
          <SubmitButton variant="secondary">Save</SubmitButton>
        </ActionForm>
        <ActionForm action={deleteBrand}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton
            variant="danger"
            pendingText="Deleting…"
            confirm={
              productCount > 0
                ? `Delete ${name}? Its ${productCount} product${productCount === 1 ? "" : "s"} will be left with no brand.`
                : `Delete ${name}?`
            }
          >
            Delete
          </SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-2 text-xs text-muted">
        {productCount} product{productCount === 1 ? "" : "s"}
      </p>
    </li>
  );
}
