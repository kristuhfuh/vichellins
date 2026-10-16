import { Sidebar } from "@/components/admin/Sidebar";
import { requireStaff } from "@/lib/admin/auth";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar name={staff.name} role={staff.role} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
