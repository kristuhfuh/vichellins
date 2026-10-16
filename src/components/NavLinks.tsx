"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className="rounded-full px-4 py-2.5 text-sm font-medium text-marine-900 hover:bg-surface aria-[current=page]:bg-marine-50 aria-[current=page]:text-marine-700"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNavLinks() {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {nav.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-marine-900 hover:bg-surface aria-[current=page]:bg-marine-50 aria-[current=page]:text-marine-700"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
