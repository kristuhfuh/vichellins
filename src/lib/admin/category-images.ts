import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// The product image bucket and its staff policies are part of the base admin setup.
// Category artwork lives in its own path so existing projects need no new bucket.
const BUCKET = "product-images";
const LEGACY_BUCKET = "category-images";
const MAX_BYTES = 5 * 1024 * 1024;
const PNG_HEADER = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function imageFormat(bytes: Uint8Array): { extension: string; contentType: string } | null {
  const signature = Buffer.from(bytes.subarray(0, 12));
  if (signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }
  if (signature.subarray(0, 8).equals(PNG_HEADER)) {
    return { extension: "png", contentType: "image/png" };
  }
  if (signature.toString("ascii", 0, 4) === "RIFF" && signature.toString("ascii", 8, 12) === "WEBP") {
    return { extension: "webp", contentType: "image/webp" };
  }
  return null;
}

type UploadResult = { url: string | null; error?: never } | { url?: never; error: string };

export async function uploadCategoryImage(supabase: SupabaseClient, form: FormData, id: string): Promise<UploadResult> {
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return { url: null };
  if (file.size > MAX_BYTES) return { error: "The category image must be 5 MB or smaller." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Browsers often infer file.type from the extension. A .jpg may contain PNG
  // bytes (including the project's own .jpg assets), so use the actual format.
  const format = imageFormat(bytes);
  if (!format) return { error: "This file could not be read as a JPG, PNG or WebP image. Export it again and retry." };

  const path = `categories/${id}/${crypto.randomUUID()}.${format.extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: format.contentType,
    cacheControl: "31536000",
  });
  if (error) return { error: "Couldn't upload the category image. Please try again, or check that product image uploads work." };
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

/** Only remove artwork under this category's path, never a product image. */
export async function removeCategoryImage(supabase: SupabaseClient, url: string | null, id: string) {
  if (!url) return;
  for (const [bucket, prefix] of [[BUCKET, `categories/${id}/`], [LEGACY_BUCKET, `${id}/`]]) {
    const base = supabase.storage.from(bucket).getPublicUrl("").data.publicUrl;
    if (!url.startsWith(base)) continue;
    const path = decodeURIComponent(url.slice(base.length));
    if (path.startsWith(prefix) && !path.slice(prefix.length).includes("/")) {
      await supabase.storage.from(bucket).remove([path]);
    }
    return;
  }
}
