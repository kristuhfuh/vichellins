import Link from "next/link";
import { getTopCategories } from "@/lib/catalog";
import { CartBadge } from "./CartBadge";
import { Logo } from "./Logo";

const nav = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function SearchForm({ className = "" }: { className?: string }) {
  return (
    <form action="/shop" role="search" className={className}>
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        placeholder="Search phones, laptops, speakers…"
        className="h-10 w-full rounded-full border border-line bg-surface px-4 text-sm text-marine-900 placeholder:text-muted focus:border-marine-700 focus:bg-white focus:outline-none"
      />
    </form>
  );
}

export function Header() {
  const categories = getTopCategories();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-marine-900 hover:bg-surface"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <SearchForm className="ml-auto hidden max-w-xs flex-1 md:block" />
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <CartBadge />
          <details className="group relative lg:hidden">
            <summary
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-marine-900 hover:bg-surface [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <div className="absolute right-0 top-12 w-72 rounded-2xl border border-line bg-white p-4 shadow-xl">
              <SearchForm className="mb-3 md:hidden" />
              <ul className="space-y-1">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-marine-900 hover:bg-surface">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mb-1 mt-3 px-3 text-xs font-medium uppercase tracking-wide text-muted">Categories</p>
              <ul className="space-y-1">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link href={`/category/${c.slug}`} className="block rounded-lg px-3 py-2 text-sm text-marine-900 hover:bg-surface">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </div>
      <nav aria-label="Categories" className="hidden border-t border-line lg:block">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 py-1.5">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-marine-900">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
