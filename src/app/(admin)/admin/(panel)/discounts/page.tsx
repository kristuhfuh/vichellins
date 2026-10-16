import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { AddDiscountForm, DiscountRow, type Discount } from "./forms";

export const metadata = { title: "Discounts" };

const lagosDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" });
const toDate = (iso: string | null) => (iso ? lagosDate.format(new Date(iso)) : "");

export default async function DiscountsPage() {
  await requireStaff(COMMERCE);
  const supabase = await createClient();
  const { data } = await supabase
    .from("discount_codes")
    .select("id, code, kind, value, min_subtotal, max_uses, used_count, starts_at, ends_at, is_active")
    .order("code");
  const codes: Discount[] = (data ?? []).map((d) => ({
    id: d.id,
    code: d.code,
    kind: d.kind,
    value: d.value,
    min_subtotal: d.min_subtotal,
    max_uses: d.max_uses,
    used_count: d.used_count,
    starts: toDate(d.starts_at),
    ends: toDate(d.ends_at),
    is_active: d.is_active,
  }));
  return (
    <>
      <PageHeader title="Discounts" description="Codes shoppers can enter at checkout. Codes are checked and applied by the server, so they can't be faked." />
      <div className="space-y-6">
        <Card title="Create a code"><AddDiscountForm /></Card>
        {codes.length === 0 ? <EmptyState title="No discount codes yet" /> : <ul className="space-y-3">{codes.map((d) => <DiscountRow key={d.id} d={d} />)}</ul>}
      </div>
    </>
  );
}
