"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { fail, friendlyError, type ActionState } from "@/lib/admin/errors";
import {
  checkVariants,
  normaliseSpecs,
  productPayloadSchema,
  slugify,
  toRpcPayload,
} from "@/lib/admin/product-payload";
import { loadCategories, loadSpecDefs } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";

export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return fail("The form data was corrupted. Reload the page and try again.");
  }
  const parsed = productPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(" › ") || "form";
    return fail(`Check the ${field} field: ${issue?.message ?? "invalid value"}.`);
  }
  const payload = parsed.data;

  if (!payload.name) return fail("Enter a product name.");
  const wantedSlug = slugify(payload.slug || payload.name);
  if (!wantedSlug) return fail("The product needs a web address with letters or numbers.");

  const variantProblem = checkVariants(payload);
  if (variantProblem) return fail(variantProblem);

  const supabase = await createClient();
  const [categories, defs] = await Promise.all([loadCategories(supabase), loadSpecDefs(supabase)]);
  const specResult = normaliseSpecs(payload, categories, defs);
  if ("error" in specResult) return fail(specResult.error);

  // An address generated from the name is retried with a number if taken;
  // one the user typed is left alone so they can choose another.
  const autoSlug = Boolean(payload.slug_auto) && !payload.id;
  let id: string | null = null;
  for (let attempt = 1; attempt <= (autoSlug ? 6 : 1); attempt++) {
    const slug = attempt === 1 ? wantedSlug : `${wantedSlug}-${attempt}`;
    const { data, error } = await supabase.rpc("save_product", {
      p: toRpcPayload(payload, specResult.specs, slug),
    });
    if (!error) {
      id = data as string;
      break;
    }
    if (error.message !== "slug_taken" || attempt === (autoSlug ? 6 : 1)) return fail(friendlyError(error));
  }
  if (!id) return fail("Couldn't save the product. Please try again.");

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  redirect(`/admin/products/${id}?${payload.id ? "saved" : "created"}=1`);
}
