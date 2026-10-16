"use server";

import { revalidatePath } from "next/cache";
import { CONTENT, requireStaff } from "@/lib/admin/auth";
import { done, fail, friendlyError, type ActionState } from "@/lib/admin/errors";
import { formString } from "@/lib/admin/util";
import { createClient } from "@/lib/supabase/server";

export async function saveHomepageContent(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(CONTENT);

  const hero_headline = formString(form, "hero_headline");
  const hero_accent = formString(form, "hero_accent");
  const hero_sub = formString(form, "hero_sub");

  if (!hero_headline) return fail("Enter a hero headline.");
  if (!hero_sub) return fail("Enter the hero subtext.");

  const trust = [0, 1, 2, 3].map((i) => ({
    title: formString(form, `trust_${i}_title`),
    body: formString(form, `trust_${i}_body`),
  }));

  for (const [i, item] of trust.entries()) {
    if (!item.title) return fail(`Enter a title for trust item ${i + 1}.`);
    if (!item.body) return fail(`Enter body text for trust item ${i + 1}.`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "homepage", value: { hero_headline, hero_accent, hero_sub, trust } });

  if (error) return fail(friendlyError(error));

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  return done("Homepage content saved.");
}
