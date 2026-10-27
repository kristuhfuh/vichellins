"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Admin" className="space-y-5">
      {groups.map((g) => {
        const items = g.items.filter((i) => i.roles.includes(role));
        if (items.length === 0) return null;
        return (
          <div key={g.title}>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-marine-200">{g.title}</p>
            <ul className="mt-2 space-y-0.5">
              {items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={isActive(i.href) ? "page" : undefined}
                    className={`block min-h-[44px] rounded-xl px-3 py-2.5 text-sm transition-colors ${isActive(i.href) ? "bg-marine-700 font-semibold text-white" : "text-marine-100 hover:bg-marine-800"}`}
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
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold-400 focus:px-5 focus:py-3 focus:text-marine-900">Skip to content</a>
      <aside className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-56 shrink-0 flex-col justify-between gap-8 overflow-y-auto rounded-2xl bg-marine-900 p-4 [scrollbar-width:thin] xl:w-60 lg:flex">
        <div className="space-y-8">
          <div className="px-1 pt-1">
            <Logo inverted />
          </div>
          {nav}
        </div>
        {account}
      </aside>

      <header className="sticky top-3 z-30 mx-3 mb-3 flex items-center justify-between gap-2 rounded-2xl bg-marine-900 px-3 py-2.5 shadow-sm sm:mx-5 lg:hidden">
        <Logo inverted />
        <details ref={menu} className="relative shrink-0" onKeyDown={(event) => {
          if (event.key === "Escape" && menu.current) {
            menu.current.open = false;
            menu.current.querySelector("summary")?.focus();
          }
        }} onClick={(event) => {
          if ((event.target as Element).closest("a") && menu.current) menu.current.open = false;
        }}>
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center rounded-lg px-3 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <div className="absolute -right-3 top-14 max-h-[calc(100dvh-7rem)] w-[min(20rem,calc(100vw-1.5rem))] space-y-6 overflow-y-auto overscroll-contain rounded-2xl bg-marine-900 p-4 shadow-xl ring-1 ring-marine-700">
            {nav}
            {account}
          </div>
        </details>
      </header>
    </>
  );
}
