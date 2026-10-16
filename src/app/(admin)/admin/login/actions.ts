"use server";

import { redirect } from "next/navigation";
import { fail, type ActionState } from "@/lib/admin/errors";
import { createClient } from "@/lib/supabase/server";

/** Only allow sending people back to another admin page, never to an outside URL. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "");
  return next.startsWith("/admin") && !next.startsWith("//") && !next.includes("\\") ? next : "/admin";
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return fail("Enter your email and password.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return fail("Incorrect email or password.");

  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!staff) {
    await supabase.auth.signOut();
    return fail("This account doesn't have admin access. Ask the shop owner to add you.");
  }

  redirect(safeNext(formData.get("next")));
}
