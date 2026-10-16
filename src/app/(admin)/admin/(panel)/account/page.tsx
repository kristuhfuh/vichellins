import { Card, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const me = await requireStaff();
  return (
    <>
      <PageHeader title="Your account" description={`${me.name} · ${me.email} · ${me.role}`} />
      <Card title="Change password"><ChangePasswordForm /></Card>
    </>
  );
}
