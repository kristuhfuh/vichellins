import { Card, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { AddStaffForm, StaffRow } from "./forms";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaff(["owner"]);
  const supabase = await createClient();
  const { data: rows } = await supabase.from("staff").select("user_id, role, name").order("name");

  // Emails live in the auth system, which only the service role can read.
  const emails = new Map<string, string>();
  const { data: users } = await createServiceClient().auth.admin.listUsers({ perPage: 200 });
  for (const u of users?.users ?? []) emails.set(u.id, u.email ?? "");

  const members = (rows ?? []).map((r) => ({ id: r.user_id, name: r.name, role: r.role, email: emails.get(r.user_id) ?? "" }));
  return (
    <>
      <PageHeader title="Staff" description="Who can sign in to this admin, and what they can do." />
      <div className="mb-6 grid gap-3 text-sm sm:grid-cols-3">
        {[
          ["Owner", "Everything, including staff accounts."],
          ["Staff", "Orders, products, stock, delivery, discounts and analytics."],
          ["Editor", "Categories, spec fields and brands only."],
        ].map(([r, d]) => (
          <div key={r} className="rounded-xl bg-white p-4 ring-1 ring-line">
            <p className="font-semibold text-marine-900">{r}</p>
            <p className="text-muted">{d}</p>
          </div>
        ))}
      </div>
      <div className="space-y-6">
        <Card title="Add a team member" description="They get a temporary password to share with them privately.">
          <AddStaffForm />
        </Card>
        <ul className="space-y-3">
          {members.map((m) => <StaffRow key={m.id} member={m} isMe={m.id === me.id} />)}
        </ul>
      </div>
    </>
  );
}
