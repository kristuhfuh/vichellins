import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import {
  getFeaturedProducts,
  getNewArrivals,
  getTopCategories,
  getAllProducts,
  getCategoryTreeIds,
} from "@/lib/catalog";
import { defaultHomepageContent, loadHomepageContent } from "@/lib/admin/queries";
import { supabaseConfigured } from "@/lib/supabase/env";

async function getContent() {
  if (!supabaseConfigured) return defaultHomepageContent;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    return await loadHomepageContent(supabase);
  } catch {
    return defaultHomepageContent;
  }
}

export default async function HomePage() {
  const content = await getContent();
  const categories = getTopCategories();
  const featured = getFeaturedProducts(4);
  const arrivals = getNewArrivals(4);
  const all = getAllProducts();
  const counts = Object.fromEntries(
    categories.map((c) => {
      const ids = new Set(getCategoryTreeIds(c.id));
      return [c.id, all.filter((p) => ids.has(p.categoryId)).length];
    }),
  );

  return (
    <>
      <section className="relative overflow-hidden bg-marine-900 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="inline-block rounded-full bg-marine-800 px-4 py-1.5 text-xs font-medium text-gold-300">
              Lagos&apos; gadget store
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              {content.hero_headline}
              {content.hero_accent && (
                <span className="text-gold-400"> {content.hero_accent}</span>
              )}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-marine-200">{content.hero_sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex h-12 items-center rounded-full bg-gold-400 px-7 text-sm font-semibold text-marine-900 hover:bg-gold-300">
                Shop now
              </Link>
              <Link href="/delivery-returns" className="inline-flex h-12 items-center rounded-full border border-marine-600 px-7 text-sm font-semibold text-white hover:bg-marine-800">
                Delivery &amp; returns
              </Link>
            </div>
          </div>
          <div aria-hidden="true" className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4">
            {[
              { kind: "phone" as const, tone: "#1b2433", offset: "" },
              { kind: "headphones" as const, tone: "#1a1a1a", offset: "mt-8" },
              { kind: "laptop" as const, tone: "#cfd3d9", offset: "-mt-8" },
              { kind: "watch" as const, tone: "#1a1a1a", offset: "" },
            ].map((v) => (
              <div key={v.kind} className={`aspect-square rounded-3xl bg-white/95 ${v.offset}`}>
                <ProductVisual kind={v.kind} tone={v.tone} className="h-full w-full p-6" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Why shop with us" className="mx-auto mt-10 max-w-7xl px-4 sm:mt-12 sm:px-6">
        <ul className="grid gap-4 rounded-3xl bg-marine-50 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          {content.trust.map((t) => (
            <li key={t.title}>
              <h3 className="text-sm font-semibold text-marine-900">{t.title}</h3>
              <p className="mt-1 text-sm text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cats" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 id="cats" className="text-2xl font-semibold tracking-tight text-marine-900 sm:text-3xl">Shop by category</h2>
          <Link href="/shop" className="text-sm font-medium text-marine-700 underline">View all</Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}`} className="group block rounded-3xl bg-surface p-4 transition-colors hover:bg-marine-50">
                <div className="aspect-square">
                  <ProductVisual kind={c.kind} tone="#1212b0" className="h-full w-full p-4 transition-transform group-hover:scale-105" />
                </div>
                <p className="mt-2 text-sm font-semibold text-marine-900">{c.name}</p>
                <p className="text-xs text-muted">{counts[c.id]} product{counts[c.id] === 1 ? "" : "s"}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="featured" className="mt-20 bg-surface py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between">
            <h2 id="featured" className="text-2xl font-semibold tracking-tight text-marine-900 sm:text-3xl">Customer favourites</h2>
            <Link href="/shop?sort=popular" className="text-sm font-medium text-marine-700 underline">See more</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="new" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 id="new" className="text-2xl font-semibold tracking-tight text-marine-900 sm:text-3xl">New arrivals</h2>
          <Link href="/shop?sort=newest" className="text-sm font-medium text-marine-700 underline">See more</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {arrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}
