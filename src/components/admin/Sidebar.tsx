"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(admin)/admin/actions";
import type { Role } from "@/lib/admin/auth";
import { Logo } from "@/components/Logo";

type Item = { href: string; label: string; roles: Role[] };
const all: Role[] = ["owner", "staff", "editor"];
const commerce: Role[] = ["owner", "staff"];

const groups: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/admin", label: "Dashboard", roles: all }] },
  {
    title: "Sell",
    items: [
      { href: "/admin/orders", label: "Orders", roles: commerce },
      { href: "/admin/products", label: "Products", roles: commerce },
      { href: "/admin/inventory", label: "Inventory", roles: commerce },
      { href: "/admin/discounts", label: "Discounts", roles: commerce },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/categories", label: "Categories & specs", roles: all },
      { href: "/admin/brands", label: "Brands", roles: all },
    ],
  },
  {
    title: "Content",
    items: [{ href: "/admin/homepage", label: "Homepage", roles: all }],
  },
  {
    title: "Shop",
    items: [
      { href: "/admin/delivery", label: "Delivery zones", roles: commerce },
      { href: "/admin/analytics", label: "Analytics", roles: commerce },
      { href: "/admin/staff", label: "Staff", roles: ["owner"] },
    ],
  },
];

export function Sidebar({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Admin" className="space-y-6">
      {groups.map((g) => {
        const items = g.items.filter((i) => i.roles.includes(role));
        if (items.length === 0) return null;
        return (
          <div key={g.title}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-marine-300">{g.title}</p>
            <ul className="mt-2 space-y-0.5">
              {items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={isActive(i.href) ? "page" : undefined}
                    className={`block min-h-[44px] rounded-lg px-3 py-2.5 text-sm ${isActive(i.href) ? "bg-marine-700 font-semibold text-white" : "text-marine-100 hover:bg-marine-800"}`}
                  >
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const account = (
    <div className="border-t border-marine-800 pt-4">
      <p className="truncate px-3 text-sm font-medium text-white">{name}</p>
      <p className="px-3 text-xs capitalize text-marine-300">{role}</p>
      <div className="mt-2 flex flex-col">
        <Link href="/admin/account" className="block min-h-[44px] rounded-lg px-3 py-2.5 text-sm text-marine-100 hover:bg-marine-800">
          Account
        </Link>
        <Link href="/" target="_blank" className="block min-h-[44px] rounded-lg px-3 py-2.5 text-sm text-marine-100 hover:bg-marine-800">
          View shop ↗
        </Link>
        <form action={signOut}>
          <button type="submit" className="min-h-[44px] w-full rounded-lg px-3 py-2.5 text-left text-sm text-marine-100 hover:bg-marine-800">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-64 shrink-0 flex-col justify-between overflow-y-auto rounded-2xl bg-marine-900 p-4 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex">
        <div className="space-y-8">
          <div className="px-1 pt-1">
            <Logo inverted />
          </div>
          {nav}
        </div>
        {account}
      </aside>

      <header className="sticky top-3 z-30 mx-3 mb-3 flex items-center justify-between rounded-xl bg-marine-900 px-4 py-3 shadow-lg lg:hidden">
        <Logo inverted />
        <details className="relative">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center rounded-lg px-3 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <div className="absolute right-0 top-12 max-h-[80vh] w-72 space-y-6 overflow-y-auto rounded-2xl bg-marine-900 p-4 shadow-xl ring-1 ring-marine-700">
            {nav}
            {account}
          </div>
        </details>
      </header>
    </>
  );
}
