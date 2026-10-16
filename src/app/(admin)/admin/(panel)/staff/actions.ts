"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { done, fail, friendlyError, type ActionState } from "@/lib/admin/errors";
import { formString } from "@/lib/admin/util";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ROLES = ["owner", "staff", "editor"] as const;
const tempPassword = () => randomBytes(12).toString("base64url");

/** Owners only. Re-checked here, not just on the page. */
async function owner() {
  return requireStaff(["owner"]);
}

async function ownerCount(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count } = await supabase.from("staff").select("user_id", { count: "exact", head: true }).eq("role", "owner");
  return count ?? 0;
}

export async function createStaff(_prev: ActionState, form: FormData): Promise<ActionState> {
  await owner();
  const email = formString(form, "email").toLowerCase();
  const name = formString(form, "name");
  const role = formString(form, "role");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.");
  if (!name) return fail("Enter the person's name.");
  if (!(ROLES as readonly string[]).includes(role)) return fail("Choose a role.");

  const password = tempPassword();
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    return fail(/already|exists|registered/i.test(error?.message ?? "") ? "Someone already has an account with that email." : "Couldn't create the account. Please try again.");
  }

  const supabase = await createClient();
  const { error: staffError } = await supabase.from("staff").insert({ user_id: data.user.id, role, name });
  if (staffError) {
    // Don't leave a login behind that has no staff record.
    await service.auth.admin.deleteUser(data.user.id);
    return fail(friendlyError(staffError));
  }
  revalidatePath("/admin/staff");
  return done(`Account created for ${name}. Temporary password: ${password}  (shown once. Send it privately and ask them to change it from the Account page.)`);
}

export async function updateStaff(_prev: ActionState, form: FormData): Promise<ActionState> {
  await owner();
  const id = formString(form, "id");
  const name = formString(form, "name");
  const role = formString(form, "role");
  if (!id || !name) return fail("Enter the person's name.");
  if (!(ROLES as readonly string[]).includes(role)) return fail("Choose a role.");

  const supabase = await createClient();
  const { data: current } = await supabase.from("staff").select("role").eq("user_id", id).maybeSingle();
  if (!current) return fail("That staff member no longer exists.");
  if (current.role === "owner" && role !== "owner" && (await ownerCount(supabase)) <= 1) {
    return fail("There must always be at least one owner. Make someone else an owner first.");
  }

  const { error } = await supabase.from("staff").update({ name, role }).eq("user_id", id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/admin/staff");
  return done("Saved.");
}

export async function resetStaffPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await owner();
  const id = formString(form, "id");
  if (!id) return fail("Missing staff member.");
  if (id === me.id) return fail("Change your own password from the Account page.");

  const password = tempPassword();
  const { error } = await createServiceClient().auth.admin.updateUserById(id, { password });
  if (error) return fail("Couldn't reset the password. Please try again.");
  return done(`New temporary password: ${password}  (shown once. Send it privately.)`);
}

export async function removeStaff(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await owner();
  const id = formString(form, "id");
  if (!id) return fail("Missing staff member.");
  if (id === me.id) return fail("You can't remove your own account.");

  const supabase = await createClient();
  const { data: target } = await supabase.from("staff").select("role").eq("user_id", id).maybeSingle();
  if (!target) return fail("That staff member no longer exists.");
  if (target.role === "owner" && (await ownerCount(supabase)) <= 1) return fail("There must always be at least one owner.");

  // Deleting the login also removes the staff record (cascade) and signs them out.
  const { error } = await createServiceClient().auth.admin.deleteUser(id);
  if (error) return fail("Couldn't remove that account. Please try again.");
  revalidatePath("/admin/staff");
  return done("Removed.");
}
