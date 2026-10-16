"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field, inputClass } from "@/components/admin/ui";
import { createCategory, createSpec, deleteCategory, deleteSpec, updateCategory, updateSpec } from "./actions";

type Option = { id: string; name: string; depth: number };

const kinds = [
  ["phone", "Phone"],
  ["laptop", "Laptop"],
  ["headphones", "Headphones"],
  ["earbuds", "Earbuds"],
  ["speaker", "Speaker"],
  ["watch", "Watch"],
  ["camera", "Camera"],
  ["powerbank", "Power bank"],
  ["vacuum", "Robot vacuum"],
  ["plug", "Smart plug"],
  ["charger", "Charger"],
];

function ParentSelect({ options, value, exclude }: { options: Option[]; value?: string | null; exclude?: Set<string> }) {
  return (
    <select id="parent_id" name="parent_id" defaultValue={value ?? ""} className={inputClass}>
      <option value="">None (top level)</option>
      {options
        .filter((o) => !exclude?.has(o.id))
        .map((o) => (
          <option key={o.id} value={o.id}>
            {"— ".repeat(o.depth)}
            {o.name}
          </option>
        ))}
    </select>
  );
}

export function AddCategoryForm({ options }: { options: Option[] }) {
  return (
    <ActionForm action={createCategory} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="name">
        <input id="name" name="name" required className={inputClass} placeholder="e.g. Tablets" />
      </Field>
      <Field label="Inside" htmlFor="parent_id" hint="Pick a parent to make this a sub-category.">
        <ParentSelect options={options} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Short description" htmlFor="description" hint="Shown at the top of the category page.">
          <input id="description" name="description" className={inputClass} />
        </Field>
      </div>
      <Field label="Placeholder picture" htmlFor="kind" hint="Used until real product photos are added.">
        <select id="kind" name="kind" className={inputClass}>
          {kinds.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-end">
        <SubmitButton pendingText="Adding…">Add category</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function EditCategoryForm({
  category,
  options,
  blocked,
}: {
  category: { id: string; name: string; slug: string; description: string; kind: string; parent_id: string | null; is_active: boolean; sort_order: number };
  options: Option[];
  blocked: Set<string>;
}) {
  return (
    <ActionForm action={updateCategory} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={category.id} />
      <Field label="Name" htmlFor="name">
        <input id="name" name="name" defaultValue={category.name} required className={inputClass} />
      </Field>
      <Field label="Web address" htmlFor="slug" hint={`/category/${category.slug}. Changing it breaks old links.`}>
        <input id="slug" name="slug" defaultValue={category.slug} required className={inputClass} />
      </Field>
      <Field label="Inside" htmlFor="parent_id">
        <ParentSelect options={options} value={category.parent_id} exclude={blocked} />
      </Field>
      <Field label="Placeholder picture" htmlFor="kind">
        <select id="kind" name="kind" defaultValue={category.kind} className={inputClass}>
          {kinds.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Short description" htmlFor="description">
          <input id="description" name="description" defaultValue={category.description} className={inputClass} />
        </Field>
      </div>
      <Field label="Order in menus" htmlFor="sort_order" hint="Lower numbers come first.">
        <input id="sort_order" name="sort_order" type="number" defaultValue={category.sort_order} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2.5 self-end pb-3 text-sm text-marine-900">
        <input type="checkbox" name="is_active" defaultChecked={category.is_active} className="h-4 w-4 accent-marine-700" />
        Visible in the shop
      </label>
      <div className="sm:col-span-2">
        <SubmitButton>Save category</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeleteCategoryForm({ id, name }: { id: string; name: string }) {
  return (
    <ActionForm action={deleteCategory}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingText="Deleting…" confirm={`Delete the "${name}" category? This can't be undone.`}>
        Delete category
      </SubmitButton>
    </ActionForm>
  );
}

type Spec = {
  id: string;
  label: string;
  key: string;
  type: string;
  unit: string | null;
  options: string[] | null;
  filterable: boolean;
  required: boolean;
  sort_order: number;
};

function SpecFields({ spec, idPrefix }: { spec?: Spec; idPrefix: string }) {
  const [type, setType] = useState(spec?.type ?? "text");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Field name" htmlFor={`${idPrefix}-label`} hint={spec ? `Stored as "${spec.key}". The stored name never changes.` : "For example RAM, Screen size, Battery life."}>
        <input id={`${idPrefix}-label`} name="label" defaultValue={spec?.label} required className={inputClass} />
      </Field>
      <Field label="Type" htmlFor={`${idPrefix}-type`}>
        <select id={`${idPrefix}-type`} name="type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          <option value="text">Text (any words)</option>
          <option value="number">Number</option>
          <option value="select">Choice from a list</option>
          <option value="boolean">Yes / No</option>
        </select>
      </Field>
      {type === "number" && (
        <Field label="Unit" htmlFor={`${idPrefix}-unit`} hint="Shown after the number, e.g. mAh, GB, in.">
          <input id={`${idPrefix}-unit`} name="unit" defaultValue={spec?.unit ?? ""} className={inputClass} />
        </Field>
      )}
      {type === "select" && (
        <div className="sm:col-span-2">
          <Field label="Choices" htmlFor={`${idPrefix}-options`} hint="Separate with commas, e.g. 64GB, 128GB, 256GB. Shoppers can filter by these.">
            <input id={`${idPrefix}-options`} name="options" defaultValue={spec?.options?.join(", ")} className={inputClass} />
          </Field>
        </div>
      )}
      <Field label="Order" htmlFor={`${idPrefix}-order`} hint="Lower numbers show first.">
        <input id={`${idPrefix}-order`} name="sort_order" type="number" defaultValue={spec?.sort_order ?? 0} className={inputClass} />
      </Field>
      <div className="flex flex-col justify-end gap-2 pb-1">
        {(type === "select" || type === "boolean") && (
          <label className="flex items-center gap-2.5 text-sm text-marine-900">
            <input type="checkbox" name="filterable" defaultChecked={spec?.filterable} className="h-4 w-4 accent-marine-700" />
            Let shoppers filter by this
          </label>
        )}
        <label className="flex items-center gap-2.5 text-sm text-marine-900">
          <input type="checkbox" name="required" defaultChecked={spec?.required} className="h-4 w-4 accent-marine-700" />
          Required before a product can be published
        </label>
      </div>
    </div>
  );
}

export function AddSpecForm({ categoryId }: { categoryId: string }) {
  return (
    <ActionForm action={createSpec} resetOnSuccess className="space-y-4">
      <input type="hidden" name="category_id" value={categoryId} />
      <SpecFields idPrefix="new-spec" />
      <SubmitButton pendingText="Adding…">Add field</SubmitButton>
    </ActionForm>
  );
}

export function SpecRow({ spec, categoryId }: { spec: Spec; categoryId: string }) {
  return (
    <li className="rounded-xl border border-line p-4">
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span className="font-medium text-marine-900">
            {spec.label}
            <span className="ml-2 text-xs font-normal text-muted">
              {spec.type === "select" ? `choice: ${spec.options?.join(", ")}` : spec.type === "boolean" ? "yes / no" : spec.type === "number" ? `number${spec.unit ? ` (${spec.unit})` : ""}` : "text"}
            </span>
          </span>
          <span className="flex gap-2 text-xs text-muted">
            {spec.filterable && <span className="rounded-full bg-marine-50 px-2 py-0.5 text-marine-800">filter</span>}
            {spec.required && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-gold-700">required</span>}
            <span className="underline">Edit</span>
          </span>
        </summary>
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <ActionForm action={updateSpec} className="space-y-4">
            <input type="hidden" name="id" value={spec.id} />
            <input type="hidden" name="category_id" value={categoryId} />
            <SpecFields spec={spec} idPrefix={`spec-${spec.id}`} />
            <SubmitButton>Save field</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteSpec}>
            <input type="hidden" name="id" value={spec.id} />
            <input type="hidden" name="category_id" value={categoryId} />
            <SubmitButton variant="danger" pendingText="Removing…" confirm={`Remove the "${spec.label}" field? Existing products keep their values but they will no longer show.`}>
              Remove field
            </SubmitButton>
          </ActionForm>
        </div>
      </details>
    </li>
  );
}
