import { Sidebar } from "@/components/admin/Sidebar";
import { requireStaff } from "@/lib/admin/auth";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();
  return (
    <div className="min-h-screen min-w-0 bg-surface pt-3 lg:flex lg:gap-5 lg:p-5">
      <Sidebar name={staff.name} role={staff.role} />
      <main id="admin-main" className="min-w-0 flex-1 px-3 pb-5 sm:px-5 lg:px-0 lg:py-0">
        <div className="@container mx-auto min-w-0 max-w-6xl rounded-2xl border border-line bg-white px-4 py-6 sm:px-6 sm:py-8 xl:px-8 lg:min-h-[calc(100dvh-2.5rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}
