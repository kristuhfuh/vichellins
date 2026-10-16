"use client";

import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Card, Field, inputClass } from "@/components/admin/ui";
import { createBrand } from "./actions";

export function AddBrandForm() {
  return (
    <Card title="Add a brand">
      <ActionForm action={createBrand} resetOnSuccess className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Field label="Brand name" htmlFor="new-brand">
            <input id="new-brand" name="name" required className={inputClass} placeholder="e.g. Samsung" />
          </Field>
        </div>
        <SubmitButton pendingText="Adding…">Add brand</SubmitButton>
      </ActionForm>
    </Card>
  );
}
