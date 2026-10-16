"use server";

import { requireStaff } from "@/lib/admin/auth";
import { done, fail, type ActionState } from "@/lib/admin/errors";
import { createClient } from "@/lib/supabase/server";

export async function changePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (next.length < 10) return fail("Use at least 10 characters for the new password.");
  if (next !== confirm) return fail("The two new passwords don't match.");
  if (next === current) return fail("Choose a password different from the current one.");

  const supabase = await createClient();
  // Prove it's really them at the keyboard before changing anything.
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: me.email, password: current });
  if (verifyError) return fail("Your current password is incorrect.");

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return fail(error.message.includes("weak") ? "That password is too easy to guess. Try a longer one." : "Couldn't change the password. Please try again.");
  return done("Password changed.");
}
