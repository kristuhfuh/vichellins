import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { AddZoneForm, ZoneRow } from "./forms";

export const metadata = { title: "Delivery zones" };

export default async function DeliveryPage() {
  await requireStaff(COMMERCE);
  const supabase = await createClient();
  const { data } = await supabase.from("delivery_zones").select("id, name, fee, eta, is_active, sort_order").order("sort_order").order("name");
  const zones = data ?? [];
  return (
    <>
      <PageHeader title="Delivery zones" description="Delivery is within Lagos only. Each area has a flat fee that shoppers choose at checkout." />
      <div className="space-y-6">
        <Card title="Add an area"><AddZoneForm /></Card>
        {zones.length === 0 ? (
          <EmptyState title="No delivery areas yet" body="Add at least one area, or shoppers won't be able to check out." />
        ) : (
          <ul className="space-y-3">{zones.map((z) => <ZoneRow key={z.id} zone={z} />)}</ul>
        )}
      </div>
    </>
  );
}
