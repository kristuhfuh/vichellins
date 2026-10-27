"use client";

import { useEffect, useRef, useState } from "react";

export function CategoryImageField({ initialUrl }: { initialUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const url = preview || (removed ? null : initialUrl);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const form = input.current?.form;
    const reset = () => {
      setPreview(null);
      setRemoved(false);
      setError("");
      if (input.current) input.current.value = "";
    };
    form?.addEventListener("action-success", reset);
    return () => form?.removeEventListener("action-success", reset);
  }, []);

  return (
    <div className="min-w-0 space-y-3 @min-[34rem]:col-span-2">
      <div>
        <label htmlFor="category-image" className="text-sm font-medium text-marine-900">Category image <span className="font-normal text-muted">(optional)</span></label>
        <p id="category-image-hint" className="mt-1 text-sm leading-relaxed text-muted">JPG, PNG or WebP, up to 5 MB. The image stays on the right of the card at every screen size. A transparent PNG works well.</p>
      </div>
      <div className="relative isolate min-h-44 overflow-hidden rounded-2xl border border-line bg-marine-50">
        <p className="relative z-10 max-w-[52%] p-5 text-sm font-medium leading-relaxed text-marine-900">{url ? "Your image stays anchored here →" : "Add an image to preview its position →"}</p>
        {url && (
          // Blob previews and freshly uploaded storage URLs do not need image optimization.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Category image preview" className="absolute inset-y-0 right-0 h-full w-[46%] object-contain object-right-bottom" />
        )}
      </div>
      <input
        ref={input}
        id="category-image"
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={`category-image-hint${error ? " category-image-error" : ""}`}
        aria-invalid={Boolean(error)}
        className="block min-h-11 w-full min-w-0 rounded-lg border border-line bg-white p-2 text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-marine-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-marine-800 hover:file:bg-marine-100"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setError("");
          if (!file) { setPreview(null); return; }
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setError("Choose a JPG, PNG or WebP image no larger than 5 MB.");
            event.target.value = "";
            setPreview(null);
            return;
          }
          setRemoved(false);
          setPreview(URL.createObjectURL(file));
        }}
      />
      {error && <p id="category-image-error" role="alert" className="text-sm text-danger-700">{error}</p>}
      {url && (
        <button type="button" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-danger-700 underline underline-offset-4 hover:bg-danger-50" onClick={() => {
          setPreview(null);
          setRemoved(true);
          if (input.current) input.current.value = "";
        }}>Remove image</button>
      )}
      <input type="hidden" name="remove_image" value={removed ? "on" : ""} />
    </div>
  );
}
