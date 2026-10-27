"use client";

import { useRef, useState } from "react";
import { Card, Notice } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/browser";

type Image = { id: string; url: string; alt: string; sort_order: number };

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** The storage path is everything after the bucket name in the public URL. */
function pathFromUrl(url: string) {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

export function ImageManager({ productId, initial }: { productId: string; initial: Image[] }) {
  const [images, setImages] = useState<Image[]>([...initial].sort((a, b) => a.sort_order - b.sort_order));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const supabase = useRef(createClient()).current;

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    let order = images.reduce((m, i) => Math.max(m, i.sort_order), -1) + 1;
    const added: Image[] = [];
    const problems: string[] = [];

    for (const file of Array.from(files)) {
      const ext = TYPES[file.type];
      if (!ext) {
        problems.push(`${file.name}: only JPG, PNG or WebP pictures are allowed.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: larger than 5 MB. Resize it and try again.`);
        continue;
      }
      const path = `${productId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (uploadError) {
        problems.push(`${file.name}: upload failed (${uploadError.message}).`);
        continue;
      }
      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const { data, error: insertError } = await supabase
        .from("product_images")
        .insert({ product_id: productId, url, alt: "", sort_order: order })
        .select("id, url, alt, sort_order")
        .single();
      if (insertError || !data) {
        await supabase.storage.from(BUCKET).remove([path]);
        problems.push(`${file.name}: couldn't be saved to the product.`);
        continue;
      }
      order += 1;
      added.push(data as Image);
    }

    setImages((all) => [...all, ...added]);
    if (problems.length > 0) setError(problems.join(" "));
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  async function remove(image: Image) {
    if (!window.confirm("Remove this picture?")) return;
    setError(null);
    const { error: deleteError } = await supabase.from("product_images").delete().eq("id", image.id);
    if (deleteError) {
      setError("Couldn't remove the picture. Please try again.");
      return;
    }
    const path = pathFromUrl(image.url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    setImages((all) => all.filter((i) => i.id !== image.id));
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((img, i) => ({ ...img, sort_order: i }));
    setImages(renumbered);
    setError(null);
    const results = await Promise.all(
      renumbered.map((img) => supabase.from("product_images").update({ sort_order: img.sort_order }).eq("id", img.id)),
    );
    if (results.some((r) => r.error)) setError("Couldn't save the new order. Reload and try again.");
  }

  async function saveAlt(image: Image, alt: string) {
    if (alt === image.alt) return;
    const { error: altError } = await supabase.from("product_images").update({ alt }).eq("id", image.id);
    if (altError) {
      setError("Couldn't save the description.");
      return;
    }
    setImages((all) => all.map((i) => (i.id === image.id ? { ...i, alt } : i)));
  }

  return (
    <Card title="Photos" description="The first picture is the main one. JPG, PNG or WebP, up to 5 MB each. Photos on a plain light background look best.">
      {error && <Notice tone="red">{error}</Notice>}

      {images.length > 0 && (
        <ul className="mb-5 grid gap-4 @min-[34rem]:grid-cols-2 @min-[54rem]:grid-cols-3">
          {images.map((image, i) => (
            <li key={image.id} className="rounded-xl border border-line p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.alt || "Product photo"} className="aspect-square w-full rounded-lg bg-surface object-contain" />
              <label htmlFor={`alt-${image.id}`} className="sr-only">
                Describe this picture
              </label>
              <input
                id={`alt-${image.id}`}
                defaultValue={image.alt}
                onBlur={(e) => saveAlt(image, e.target.value.trim())}
                placeholder="Describe the picture (helps search and screen readers)"
                maxLength={200}
                className="mt-2 h-9 w-full rounded-lg border border-line px-2 text-xs focus:border-marine-700 focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted">{i === 0 ? "Main picture" : `Picture ${i + 1}`}</span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier" className="rounded px-2 py-1 hover:bg-surface disabled:opacity-30">
                    ←
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Move later" className="rounded px-2 py-1 hover:bg-surface disabled:opacity-30">
                    →
                  </button>
                  <button type="button" onClick={() => remove(image)} className="rounded px-2 py-1 text-danger-700 hover:bg-danger-50">
                    Remove
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label htmlFor="photo-upload" className="inline-flex h-10 cursor-pointer items-center rounded-full bg-marine-700 px-5 text-sm font-semibold text-white hover:bg-marine-800 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          {busy ? "Uploading…" : images.length > 0 ? "Add more photos" : "Upload photos"}
          <input
            ref={input}
            id="photo-upload"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => upload(e.target.files)}
            className="sr-only"
          />
        </label>
      </div>
    </Card>
  );
}
