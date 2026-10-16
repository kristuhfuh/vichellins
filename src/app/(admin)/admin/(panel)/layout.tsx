import { Sidebar } from "@/components/admin/Sidebar";
import { requireStaff } from "@/lib/admin/auth";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();
  return (
    <div className="min-h-screen bg-surface lg:flex lg:gap-5 lg:p-5">
      <Sidebar name={staff.name} role={staff.role} />
      <main className="min-w-0 flex-1 px-4 py-4 lg:px-0 lg:py-0">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white px-6 py-8 shadow-md ring-1 ring-line sm:px-8 lg:min-h-[calc(100vh-2.5rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}
