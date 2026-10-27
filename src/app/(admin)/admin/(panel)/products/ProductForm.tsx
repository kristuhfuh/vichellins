"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PendingProvider, SubmitButton, useServerAction } from "@/components/admin/forms";
import { Card, Field, inputClass, Notice } from "@/components/admin/ui";
import { optionKey, slugify } from "@/lib/admin/util";
import { saveProduct } from "./actions";

export type SpecDefLite = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  unit: string | null;
  options: string[] | null;
  required: boolean;
};

export type VariantData = {
  id: string;
  sku: string;
  option_values: Record<string, string>;
  price: number;
  compare_at_price: number | null;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
};

export type ProductData = {
  id: string;
  name: string;
  slug: string;
  brand_id: string | null;
  category_id: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  description: string;
  highlights: string[];
  condition: "new" | "refurbished" | "used";
  warranty_months: number;
  warranty_type: "manufacturer" | "store" | "none";
  warranty_notes: string | null;
  authenticity_status: "verified" | "unverified";
  authenticity_notes: string | null;
  specs: Record<string, unknown>;
  seo_title: string | null;
  seo_description: string | null;
  kind: string | null;
  tone: string | null;
  options: { name: string; values: string[] }[];
  variants: VariantData[];
};

type Row = {
  id: string | null;
  optionValues: Record<string, string>;
  sku: string;
  price: string;
  compare: string;
  stock: string;
  threshold: string;
  active: boolean;
};

type OptionDraft = { name: string; valuesText: string };

const SEP = "\u0001";
const comboKey = (names: string[], values: Record<string, string>) => names.map((n) => values[n] ?? "").join(SEP);
const unique = (items: string[]) => [...new Set(items)];
const toInt = (v: string): number | null => {
  const t = v.replace(/[₦,\s]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

function cartesian(options: { name: string; values: string[] }[]): Record<string, string>[] {
  return options.reduce<Record<string, string>[]>(
    (acc, o) => acc.flatMap((combo) => o.values.map((v) => ({ ...combo, [o.name]: v }))),
    [{}],
  );
}

function suggestSku(name: string, combo: Record<string, string>, taken: Set<string>) {
  const base = slugify(name).toUpperCase().replace(/-/g, "").slice(0, 14) || "ITEM";
  const parts = Object.values(combo).map((v) => slugify(v).toUpperCase().replace(/-/g, ""));
  const sku = [base, ...parts].join("-");
  let candidate = sku;
  for (let i = 2; taken.has(candidate); i++) candidate = `${sku}-${i}`;
  return candidate;
}

const rowFromVariant = (v: VariantData): Row => ({
  id: v.id,
  optionValues: v.option_values,
  sku: v.sku,
  price: String(v.price),
  compare: v.compare_at_price === null ? "" : String(v.compare_at_price),
  stock: String(v.stock),
  threshold: String(v.low_stock_threshold),
  active: v.is_active,
});

const money = "w-full min-w-[96px] rounded-lg border border-line bg-white px-2 py-2 text-sm focus:border-marine-700 focus:outline-none";

export function ProductForm({
  product,
  categories,
  brands,
  specsByCategory,
  defaultCategoryId,
}: {
  product: ProductData | null;
  categories: { id: string; name: string; depth: number }[];
  brands: { id: string; name: string }[];
  specsByCategory: Record<string, SpecDefLite[]>;
  defaultCategoryId?: string;
}) {
  const { state, onSubmit, pending } = useServerAction(saveProduct);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [brandId, setBrandId] = useState(product?.brand_id ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? "");
  const [status, setStatus] = useState<ProductData["status"]>(product?.status ?? "draft");
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [description, setDescription] = useState(product?.description ?? "");
  const [highlights, setHighlights] = useState((product?.highlights ?? []).join("\n"));
  const [condition, setCondition] = useState<ProductData["condition"]>(product?.condition ?? "new");
  const [warrantyType, setWarrantyType] = useState<ProductData["warranty_type"]>(product?.warranty_type ?? "manufacturer");
  const [warrantyMonths, setWarrantyMonths] = useState(String(product?.warranty_months ?? 12));
  const [warrantyNotes, setWarrantyNotes] = useState(product?.warranty_notes ?? "");
  const [authStatus, setAuthStatus] = useState<ProductData["authenticity_status"]>(product?.authenticity_status ?? "unverified");
  const [authNotes, setAuthNotes] = useState(product?.authenticity_notes ?? "");
  const [seoTitle, setSeoTitle] = useState(product?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seo_description ?? "");
  const [specs, setSpecs] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(product?.specs ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [options, setOptions] = useState<OptionDraft[]>(
    (product?.options ?? []).map((o) => ({ name: o.name, valuesText: o.values.join(", ") })),
  );
  const [rows, setRows] = useState<Row[]>(() =>
    product && product.variants.length > 0
      ? product.variants.map(rowFromVariant)
      : [{ id: null, optionValues: {}, sku: "", price: "", compare: "", stock: "0", threshold: "3", active: true }],
  );

  const parsedOptions = useMemo(
    () =>
      options
        .map((o) => ({
          name: o.name.trim(),
          values: unique(o.valuesText.split(",").map((v) => v.trim()).filter(Boolean)),
        }))
        .filter((o) => o.name && o.values.length > 0),
    [options],
  );
  const optionNames = parsedOptions.map((o) => o.name);
  const validKeys = useMemo(() => new Set(cartesian(parsedOptions).map((c) => comboKey(optionNames, c))), [parsedOptions, optionNames]);
  const optionKeySet = new Set(optionNames.map(optionKey));
  const specDefs = (specsByCategory[categoryId] ?? []).filter((d) => !optionKeySet.has(d.key));

  const isStale = (r: Row) => !validKeys.has(comboKey(optionNames, r.optionValues));
  const label = (r: Row) => Object.values(r.optionValues).join(" / ") || "Default";

  function generate() {
    const combos = cartesian(parsedOptions);
    setRows((current) => {
      const kept = current.filter((r) => r.id || !isStale(r));
      const have = new Set(kept.map((r) => comboKey(optionNames, r.optionValues)));
      const template = kept[0];
      const taken = new Set(kept.map((r) => r.sku));
      const added: Row[] = [];
      for (const combo of combos) {
        if (have.has(comboKey(optionNames, combo))) continue;
        const sku = suggestSku(name, combo, taken);
        taken.add(sku);
        added.push({
          id: null,
          optionValues: combo,
          sku,
          price: template?.price ?? "",
          compare: "",
          stock: "0",
          threshold: template?.threshold ?? "3",
          active: true,
        });
      }
      return [...kept, ...added];
    });
  }

  const updateRow = (index: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const problems: string[] = [];
  for (const r of rows) {
    if (isStale(r)) {
      problems.push(
        r.id && !r.active
          ? ""
          : r.id
            ? `"${label(r)}" uses an option value that no longer exists. Add the value back, or untick Active.`
            : `"${label(r)}" doesn't match the options. Remove it, or press "Create missing variants".`,
      );
    }
  }
  const visibleProblems = problems.filter(Boolean);
  if (options.some((o) => o.name.trim() && o.valuesText.trim() === "")) {
    visibleProblems.push("Every option needs at least one value.");
  }

  const payload = {
    id: product?.id ?? null,
    name: name.trim(),
    slug: slug.trim(),
    slug_auto: !slugTouched,
    brand_id: brandId || null,
    category_id: categoryId,
    status,
    featured,
    description: description.trim(),
    highlights: highlights.split("\n").map((l) => l.trim()).filter(Boolean),
    condition,
    warranty_months: warrantyType === "none" ? 0 : Math.max(0, Math.round(Number(warrantyMonths) || 0)),
    warranty_type: warrantyType,
    warranty_notes: warrantyNotes.trim(),
    authenticity_status: authStatus,
    authenticity_notes: authNotes.trim(),
    specs,
    seo_title: seoTitle.trim(),
    seo_description: seoDescription.trim(),
    kind: product?.kind ?? null,
    tone: product?.tone ?? null,
    options: parsedOptions,
    variants: rows
      // Inactive variants left over from removed option values are dropped; the database deactivates them.
      .filter((r) => !(isStale(r) && r.id && !r.active))
      .map((r) => ({
        id: r.id,
        option_values: r.optionValues,
        sku: r.sku.trim(),
        price: toInt(r.price),
        compare_at_price: toInt(r.compare),
        stock: toInt(r.stock),
        low_stock_threshold: toInt(r.threshold) ?? 3,
        is_active: r.active,
      })),
  };

  const bind = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    set(e.target.value);

  return (
    <PendingProvider pending={pending}>
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <Card title="Basics">
        <div className="grid gap-4 @min-[34rem]:grid-cols-2">
          <div className="@min-[34rem]:col-span-2">
            <Field label="Product name" htmlFor="name">
              <input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                required
                maxLength={160}
                className={inputClass}
                placeholder="e.g. Sonique Studio ANC Headphones"
              />
            </Field>
          </div>
          <div className="@min-[34rem]:col-span-2">
            <Field
              label="Web address"
              htmlFor="slug"
              hint={`yourshop.com/product/${slug || "…"}${product ? ". Changing it breaks old links to this product." : ""}`}
            >
              <input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Category" htmlFor="category">
            <select id="category" value={categoryId} onChange={bind(setCategoryId)} className={inputClass}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {"— ".repeat(c.depth)}
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand" htmlFor="brand">
            <select id="brand" value={brandId} onChange={bind(setBrandId)} className={inputClass}>
              <option value="">No brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Status"
            htmlFor="status"
            hint={status === "draft" ? "Draft: only staff can see it." : status === "published" ? "Published: visible in the shop." : "Archived: hidden but kept for order history."}
          >
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value as ProductData["status"])} className={inputClass}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <label className="flex items-center gap-2.5 self-center pt-2 text-sm text-marine-900">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-marine-700" />
            Feature on the home page
          </label>
          <div className="@min-[34rem]:col-span-2">
            <Field label="Description" htmlFor="description">
              <textarea id="description" value={description} onChange={bind(setDescription)} rows={4} maxLength={5000} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </div>
          <div className="@min-[34rem]:col-span-2">
            <Field label="Highlights" htmlFor="highlights" hint="One per line, e.g. “40 hour battery”. Shown as bullet points (max 12).">
              <textarea id="highlights" value={highlights} onChange={bind(setHighlights)} rows={3} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Condition, warranty and authenticity" description="Shown on the product page so buyers know exactly what they're getting.">
        <div className="grid gap-4 @min-[34rem]:grid-cols-2">
          <Field label="Condition" htmlFor="condition">
            <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value as ProductData["condition"])} className={inputClass}>
              <option value="new">New</option>
              <option value="refurbished">Refurbished</option>
              <option value="used">Used</option>
            </select>
          </Field>
          <div />
          <Field label="Warranty" htmlFor="warranty-type">
            <select id="warranty-type" value={warrantyType} onChange={(e) => setWarrantyType(e.target.value as ProductData["warranty_type"])} className={inputClass}>
              <option value="manufacturer">Manufacturer warranty</option>
              <option value="store">Store warranty</option>
              <option value="none">No warranty</option>
            </select>
          </Field>
          <Field label="Warranty length (months)" htmlFor="warranty-months">
            <input id="warranty-months" type="number" min={0} max={120} value={warrantyType === "none" ? 0 : warrantyMonths} disabled={warrantyType === "none"} onChange={bind(setWarrantyMonths)} className={inputClass} />
          </Field>
          <div className="@min-[34rem]:col-span-2">
            <Field label="Warranty notes" htmlFor="warranty-notes" hint="What is and isn't covered.">
              <input id="warranty-notes" value={warrantyNotes} onChange={bind(setWarrantyNotes)} maxLength={500} className={inputClass} />
            </Field>
          </div>
          <Field label="Authenticity" htmlFor="authenticity">
            <select id="authenticity" value={authStatus} onChange={(e) => setAuthStatus(e.target.value as ProductData["authenticity_status"])} className={inputClass}>
              <option value="verified">Verified genuine</option>
              <option value="unverified">Not verified</option>
            </select>
          </Field>
          <Field label="Authenticity notes" htmlFor="authenticity-notes" hint="e.g. “Sealed box, IMEI checked”.">
            <input id="authenticity-notes" value={authNotes} onChange={bind(setAuthNotes)} maxLength={500} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card
        title="Specifications"
        description={specDefs.length > 0 ? "These fields come from the category. Edit them under Categories & specs." : "This category has no spec fields yet. Add some under Categories & specs."}
      >
        {specDefs.length > 0 && (
          <div className="grid gap-4 @min-[34rem]:grid-cols-2">
            {specDefs.map((d) => (
              <Field key={d.key} label={`${d.label}${d.unit ? ` (${d.unit})` : ""}${d.required ? " *" : ""}`} htmlFor={`spec-${d.key}`}>
                {d.type === "select" || d.type === "boolean" ? (
                  <select id={`spec-${d.key}`} value={specs[d.key] ?? ""} onChange={(e) => setSpecs((s) => ({ ...s, [d.key]: e.target.value }))} className={inputClass}>
                    <option value="">Not set</option>
                    {d.type === "boolean" ? (
                      <>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </>
                    ) : (
                      d.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <input
                    id={`spec-${d.key}`}
                    type={d.type === "number" ? "number" : "text"}
                    step="any"
                    value={specs[d.key] ?? ""}
                    onChange={(e) => setSpecs((s) => ({ ...s, [d.key]: e.target.value }))}
                    className={inputClass}
                  />
                )}
              </Field>
            ))}
          </div>
        )}
        {optionKeySet.size > 0 && (
          <p className="mt-3 text-xs text-muted">Specs that you also use as variant options (like RAM or Storage) are set per variant below.</p>
        )}
      </Card>

      <Card
        title="Options and variants"
        description="Use options when the product comes in versions, like Colour or Storage. Each version is a variant with its own SKU, price and stock. A product with no options has one variant."
      >
        <div className="space-y-3">
          {options.map((o, i) => (
            <div key={i} className="grid gap-3 rounded-xl bg-surface p-3 @min-[42rem]:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]">
              <div>
                <label htmlFor={`opt-name-${i}`} className="sr-only">
                  Option name
                </label>
                <input id={`opt-name-${i}`} value={o.name} onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Option, e.g. Colour" maxLength={40} className={`${inputClass} mt-0`} />
              </div>
              <div>
                <label htmlFor={`opt-values-${i}`} className="sr-only">
                  Option values
                </label>
                <input id={`opt-values-${i}`} value={o.valuesText} onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? { ...x, valuesText: e.target.value } : x)))} placeholder="Values, separated by commas: Black, Silver, Gold" className={`${inputClass} mt-0`} />
              </div>
              <button type="button" onClick={() => setOptions((all) => all.filter((_, j) => j !== i))} className="h-11 rounded-lg px-3 text-sm text-danger-700 hover:bg-danger-50">
                Remove
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {options.length < 3 && (
              <button type="button" onClick={() => setOptions((all) => [...all, { name: "", valuesText: "" }])} className="h-10 rounded-full border border-line px-4 text-sm font-semibold text-marine-900 hover:border-marine-700">
                + Add option
              </button>
            )}
            <button type="button" onClick={generate} className="h-10 rounded-full bg-marine-50 px-4 text-sm font-semibold text-marine-800 hover:bg-marine-100">
              Create missing variants
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-surface">
              <tr className="text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2.5 font-semibold">Variant</th>
                <th className="px-3 py-2.5 font-semibold">SKU</th>
                <th className="px-3 py-2.5 font-semibold">Price (₦)</th>
                <th className="px-3 py-2.5 font-semibold">Compare-at (₦)</th>
                <th className="px-3 py-2.5 font-semibold">Stock</th>
                <th className="px-3 py-2.5 font-semibold">Low at</th>
                <th className="px-3 py-2.5 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => {
                const stale = isStale(r);
                return (
                  <tr key={r.id ?? `new-${i}`} className={stale ? "bg-danger-50" : r.active ? "" : "bg-surface/60"}>
                    <td className="px-3 py-2 font-medium text-marine-900">
                      {label(r)}
                      {stale && <span className="ml-2 text-xs font-normal text-danger-700">doesn&apos;t match options</span>}
                      {!r.id && !stale && <span className="ml-2 text-xs font-normal text-marine-700">new</span>}
                    </td>
                    <td className="px-3 py-2">
                      <input aria-label={`SKU for ${label(r)}`} value={r.sku} onChange={(e) => updateRow(i, { sku: e.target.value })} className={`${money} min-w-[190px]`} />
                    </td>
                    <td className="px-3 py-2">
                      <input aria-label={`Price for ${label(r)}`} inputMode="numeric" value={r.price} onChange={(e) => updateRow(i, { price: e.target.value })} className={money} />
                    </td>
                    <td className="px-3 py-2">
                      <input aria-label={`Compare-at price for ${label(r)}`} inputMode="numeric" value={r.compare} onChange={(e) => updateRow(i, { compare: e.target.value })} className={money} placeholder="optional" />
                    </td>
                    <td className="px-3 py-2">
                      {r.id ? (
                        <span title="Change stock from the Inventory page so every change is logged.">
                          {r.stock}{" "}
                          <Link href={`/admin/inventory?q=${encodeURIComponent(r.sku)}`} className="text-xs text-marine-700 underline">
                            adjust
                          </Link>
                        </span>
                      ) : (
                        <input aria-label={`Starting stock for ${label(r)}`} inputMode="numeric" value={r.stock} onChange={(e) => updateRow(i, { stock: e.target.value })} className={`${money} min-w-[72px]`} />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input aria-label={`Low-stock level for ${label(r)}`} inputMode="numeric" value={r.threshold} onChange={(e) => updateRow(i, { threshold: e.target.value })} className={`${money} min-w-[60px]`} />
                    </td>
                    <td className="px-3 py-2">
                      {r.id ? (
                        <input type="checkbox" aria-label={`${label(r)} is active`} checked={r.active} onChange={(e) => updateRow(i, { active: e.target.checked })} className="h-4 w-4 accent-marine-700" />
                      ) : (
                        <button type="button" onClick={() => setRows((all) => all.filter((_, j) => j !== i))} className="text-xs text-danger-700 underline">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          Variants that already exist can&apos;t be deleted, because orders and stock history refer to them. Untick Active to hide one from the shop.
        </p>
      </Card>

      <Card title="Search engine listing (optional)">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-marine-700">Edit how this product appears in Google results</summary>
          <div className="mt-4 grid gap-4">
            <Field label="Search page title" htmlFor="seo-title" hint="Leave blank to use the product name.">
              <input id="seo-title" value={seoTitle} onChange={bind(setSeoTitle)} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Search description" htmlFor="seo-description" hint="Leave blank to use the product description.">
              <textarea id="seo-description" value={seoDescription} onChange={bind(setSeoDescription)} rows={2} maxLength={300} className={`${inputClass} h-auto py-2.5`} />
            </Field>
          </div>
        </details>
      </Card>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
          <SubmitButton pendingText="Saving…">{product ? "Save changes" : "Create product"}</SubmitButton>
          <Link href="/admin/products" className="text-sm text-muted underline">
            Cancel
          </Link>
          <div className="min-w-0 flex-1">
            {state?.message && !state.ok && <p role="alert" className="text-sm font-medium text-danger-700">{state.message}</p>}
            {visibleProblems.length > 0 && (
              <ul className="text-sm text-danger-700">
                {visibleProblems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </form>
    </PendingProvider>
  );
}

export function SavedNotice({ created, saved }: { created: boolean; saved: boolean }) {
  if (created) return <Notice tone="green">Product created. Add photos below, then set the status to Published when it&apos;s ready.</Notice>;
  if (saved) return <Notice tone="green">Saved.</Notice>;
  return null;
}
