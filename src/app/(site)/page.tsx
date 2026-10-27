import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { CategoryCard } from "@/components/CategoryCard";
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
  const [content, categories, featured, arrivals, all] = await Promise.all([
    getContent(),
    getTopCategories(),
    getFeaturedProducts(4),
    getNewArrivals(4),
    getAllProducts(),
  ]);
  const treeIdsByCategory = new Map(
    await Promise.all(categories.map(async (c) => [c.id, await getCategoryTreeIds(c.id)] as const)),
  );
  const counts = Object.fromEntries(
    categories.map((c) => {
      const ids = new Set(treeIdsByCategory.get(c.id));
      return [c.id, all.filter((p) => ids.has(p.categoryId)).length];
    }),
  );

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden bg-marine-700 text-white">
        {/* Oversized VICHELLINS wordmark bleeds beneath the content for presence. */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-2 select-none whitespace-nowrap text-center text-[clamp(4rem,17vw,16rem)] font-black leading-[0.8] tracking-tighter text-white/5"
        >
          VICHELLINS
        </p>

        <div className="relative mx-auto grid max-w-7xl items-center gap-4 px-4 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:pt-0">
          <div className="relative z-10 max-w-xl lg:py-20">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/60 bg-marine-800/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold-300">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold-400" />
              Lagos&apos; gadget store
            </p>
            <h1 className="mt-6 text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.08] tracking-[-0.035em] [text-wrap:balance]">
              {content.hero_headline}
              {content.hero_accent && (
                <span className="block text-gold-400">{content.hero_accent}</span>
              )}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-marine-100 sm:text-lg">{content.hero_sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold-400 px-7 py-3.5 text-sm font-semibold text-marine-900 transition-colors hover:bg-gold-300"
              >
                Shop now
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <Link
                href="/delivery-returns"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Delivery &amp; returns
              </Link>
            </div>
          </div>

          {/* One bounded scene keeps the products beside the copy on desktop
              and below it on mobile, without overlapping the actions. */}
          <div className="pointer-events-none relative mx-auto aspect-square w-full max-w-lg self-end overflow-hidden" aria-hidden="true">
            <Image
              src="/smartwatch.png"
              alt=""
              width={454}
              height={454}
              sizes="(min-width: 640px) 215px, 42vw"
              className="absolute right-0 top-0 z-10 w-[42%] rotate-12 drop-shadow-xl"
            />
            <Image
              src="/elegant-smartphone-composition.png"
              alt=""
              width={1081}
              height={951}
              preload
              sizes="(min-width: 1024px) 800px, (min-width: 640px) 768px, 150vw"
              className="absolute -bottom-px -left-[37%] w-[160%] max-w-none drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- trust strip */}
      <section aria-label="Why shop with us" className="border-b border-line bg-white">
        <ul className="mx-auto grid max-w-7xl gap-x-8 gap-y-8 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-4 lg:divide-x lg:divide-line lg:gap-x-0">
          {content.trust.map((t, i) => (
            <li key={t.title} className="relative lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <span
                aria-hidden="true"
                className="block text-xs font-semibold uppercase tracking-[0.2em] text-gold-700"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-marine-900 sm:text-2xl">
                {t.title}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------- shop by category */}
      <section
        aria-labelledby="cats"
        className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
              The catalogue
            </p>
            <h2 id="cats" className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-tight text-marine-900">
              Shop by category
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-marine-700 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-marine-800"
          >
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>

        {categories.length > 0 && (
          <div className={`mt-8 grid gap-5 sm:mt-10 ${categories.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {categories.map((category, index) => (
              <div key={category.id} className={index === 0 && categories.length > 1 && categories.length % 2 === 1 ? "sm:col-span-2" : "min-w-0"}>
                <CategoryCard category={category} count={counts[category.id]} featured={index === 0} index={index} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------- customer favourites */}
      <section
        aria-labelledby="featured"
        className="relative mt-16 overflow-hidden bg-surface py-16 sm:mt-20 sm:py-20"
      >
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          {/* A short gold bar anchors the chapter opener to the content column. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-0 h-1 w-16 bg-gold-400 sm:left-6"
          />
          <div className="flex flex-wrap items-end justify-between gap-4 pt-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
                What people love
              </p>
              <h2
                id="featured"
                className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-tight text-marine-900"
              >
                Customer favourites
              </h2>
            </div>
            <Link
              href="/shop?sort=popular"
              className="text-sm font-semibold text-marine-700 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-marine-800"
            >
              See more <span aria-hidden="true">→</span>
            </Link>
          </div>

          {featured.length > 0 && (
            <div className="mt-10 grid gap-x-4 gap-y-10 min-[380px]:grid-cols-2 lg:grid-cols-4 lg:gap-x-6">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* -------------------------------------------------- new arrivals
          Horizontal rail: on mobile and tablet the next card peeks in to
          signal there's more; on desktop it opens into a straight 4-col row. */}
      <section aria-labelledby="new" className="py-16 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
              Just in
            </p>
            <h2 id="new" className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-tight text-marine-900">
              New arrivals
            </h2>
          </div>
          <Link
            href="/shop?sort=newest"
            className="text-sm font-semibold text-marine-700 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-marine-800"
          >
            See more <span aria-hidden="true">→</span>
          </Link>
        </div>
        {arrivals.length > 0 && (
          <ul
            className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:gap-6 sm:px-6 lg:mx-auto lg:max-w-7xl lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:pb-0"
            aria-label="New arrivals"
          >
            {arrivals.map((p) => (
              <li
                key={p.id}
                className="w-[72%] shrink-0 snap-start sm:w-[42%] md:w-[32%] lg:w-auto lg:shrink"
              >
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
