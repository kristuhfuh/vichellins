import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "staff" | "editor";

export type Staff = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/** The signed-in staff member, or null. Verifies the token with Supabase, not just the cookie. */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: row } = await supabase
    .from("staff")
    .select("role, name")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!row) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    name: row.name || data.user.email || "Staff",
    role: row.role as Role,
  };
}

/**
 * Guard for admin pages and actions. Redirects to login when signed out or not
 * staff. When `roles` is given, anyone else is sent back to the dashboard.
 */
export async function requireStaff(roles?: Role[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (roles && !roles.includes(staff.role)) redirect("/admin?denied=1");
  return staff;
}

export const COMMERCE: Role[] = ["owner", "staff"];
export const CONTENT: Role[] = ["owner", "staff", "editor"];
