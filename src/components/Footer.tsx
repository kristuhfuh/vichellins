import Link from "next/link";
import { getTopCategories } from "@/lib/catalog";
import { store, whatsappLink } from "@/lib/config";
import { Logo } from "./Logo";

const socials = [
  { label: "Instagram", url: store.social.instagram },
  { label: "TikTok", url: store.social.tiktok },
  { label: "X", url: store.social.x },
  { label: "Facebook", url: store.social.facebook },
].filter((s): s is { label: string; url: string } => Boolean(s.url));

const columns = [
  {
    title: "Shop",
    links: getTopCategories().map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
  },
  {
    title: "Help",
    links: [
      { href: "/contact", label: "Contact us" },
      { href: "/faq", label: "FAQ" },
      { href: "/delivery-returns", label: "Delivery & returns" },
      { href: "/warranty", label: "Warranty" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 px-4 pb-6 sm:px-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-marine-900 text-white">
        <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions before you buy?
              <br />
              <span className="text-gold-400">Ask us on WhatsApp.</span>
            </h2>
          </div>
          <div className="lg:justify-self-end lg:text-right">
            <p className="max-w-md text-sm text-marine-200 lg:ml-auto">
              Send a message for stock checks, product advice or to place an order. We reply quickly during business hours.
            </p>
            <a
              href={whatsappLink("Hello Vichellins Nation, I have a question about a product.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-12 items-center rounded-full bg-gold-400 px-6 text-sm font-semibold text-marine-900 hover:bg-gold-300"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">{store.description}</p>
          {socials.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-full border border-line px-4 text-xs font-medium text-marine-900 hover:border-marine-700">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-sm font-semibold text-marine-900">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted hover:text-marine-900">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
        <p>Delivery within Lagos only.</p>
      </div>
    </footer>
  );
}
