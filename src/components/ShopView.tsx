import Link from "next/link";
import {
  filterProducts,
  getBrands,
  getCategoryPath,
  getChildCategories,
  getSpecFilters,
  getTopCategories,
  getCategoryTreeIds,
  getAllProducts,
  paginate,
} from "@/lib/catalog";
import { parseShopQuery, withParams } from "@/lib/query";
import type { Category, Sort } from "@/lib/types";
import { ProductCard } from "./ProductCard";

type Params = Record<string, string | string[] | undefined>;

const sortOptions: { value: Sort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const checkbox = "h-4 w-4 rounded border-line accent-marine-700";

async function CategoryNav({ active }: { active?: Category }) {
  const [activePath, topCategories] = await Promise.all([
    active ? getCategoryPath(active.id).then((p) => p.map((c) => c.id)) : Promise.resolve<string[]>([]),
    getTopCategories(),
  ]);
  const childrenMap = new Map(
    await Promise.all(topCategories.map(async (c) => [c.id, await getChildCategories(c.id)] as const)),
  );
  return (
    <nav aria-label="Categories">
      <h2 className="text-sm font-semibold text-marine-900">Category</h2>
      <ul className="mt-3 space-y-0.5 text-sm">
        <li>
          <Link
            href="/shop"
            className={`block rounded-lg px-3 py-2 ${!active ? "bg-marine-50 font-semibold text-marine-800" : "text-marine-900 hover:bg-surface"}`}
          >
            All products
          </Link>
        </li>
        {topCategories.map((c) => {
          const children = childrenMap.get(c.id) ?? [];
          const open = activePath.includes(c.id);
          return (
            <li key={c.id}>
              <Link
                href={`/category/${c.slug}`}
                aria-current={active?.id === c.id ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 ${active?.id === c.id ? "bg-marine-50 font-semibold text-marine-800" : "text-marine-900 hover:bg-surface"}`}
              >
                {c.name}
              </Link>
              {open && children.length > 0 && (
                <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-line pl-2">
                  {children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/category/${child.slug}`}
                        aria-current={active?.id === child.id ? "page" : undefined}
                        className={`block rounded-lg px-3 py-1.5 ${active?.id === child.id ? "bg-marine-50 font-semibold text-marine-800" : "text-muted hover:bg-surface hover:text-marine-900"}`}
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export async function ShopView({
  basePath,
  params,
  category,
  heading,
  intro,
}: {
  basePath: string;
  params: Params;
  category?: Category;
  heading: string;
  intro?: string;
}) {
  const query = parseShopQuery(params, category?.id);
  const [results, allProducts, allBrands, treeIds] = await Promise.all([
    filterProducts(query),
    getAllProducts(),
    getBrands(),
    category ? getCategoryTreeIds(category.id) : Promise.resolve<string[]>([]),
  ]);
  const page = paginate(results, query.page);

  // Filter options come from the whole category, not the filtered result, so choices don't vanish as you pick them.
  const pool = category
    ? allProducts.filter((p) => treeIds.includes(p.categoryId))
    : allProducts;
  const specFilters = await getSpecFilters(category?.id, pool);
  const brandIds = new Set(pool.map((p) => p.brandId));
  const brands = allBrands.filter((b) => brandIds.has(b.id));
  const hasConditionChoice = new Set(pool.map((p) => p.condition)).size > 1;
  const breadcrumbPath = category ? await getCategoryPath(category.id) : [];

  const activeCount =
    (query.brands?.length ?? 0) +
    (query.conditions?.length ?? 0) +
    (query.min !== undefined ? 1 : 0) +
    (query.max !== undefined ? 1 : 0) +
    (query.inStock ? 1 : 0) +
    Object.values(query.specs ?? {}).reduce((n, v) => n + v.length, 0);

  const hidden = [
    ...(query.q ? [["q", query.q]] : []),
    ...(query.sort && query.sort !== "featured" ? [["sort", query.sort]] : []),
  ];

  const sidebar = (
    <>
          <CategoryNav active={category} />

          <form action={basePath} className="space-y-6">
            {hidden.map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <h2 className="text-sm font-semibold text-marine-900">
              Filters{activeCount > 0 && ` (${activeCount})`}
            </h2>
            <div className="space-y-6">
                <fieldset>
                  <legend className="text-sm font-medium text-marine-900">Price (₦)</legend>
                  <div className="mt-2 flex items-center gap-2">
                    <input name="min" type="number" min={0} step={1000} defaultValue={query.min} placeholder="Min" aria-label="Minimum price" className="h-10 w-full rounded-lg border border-line px-3 text-sm" />
                    <span className="text-muted">–</span>
                    <input name="max" type="number" min={0} step={1000} defaultValue={query.max} placeholder="Max" aria-label="Maximum price" className="h-10 w-full rounded-lg border border-line px-3 text-sm" />
                  </div>
                </fieldset>

                {brands.length > 1 && (
                  <fieldset>
                    <legend className="text-sm font-medium text-marine-900">Brand</legend>
                    <div className="mt-2 space-y-2">
                      {brands.map((b) => (
                        <label key={b.id} className="flex items-center gap-2.5 text-sm text-marine-900">
                          <input type="checkbox" name="brand" value={b.id} defaultChecked={query.brands?.includes(b.id)} className={checkbox} />
                          {b.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {hasConditionChoice && (
                  <fieldset>
                    <legend className="text-sm font-medium text-marine-900">Condition</legend>
                    <div className="mt-2 space-y-2">
                      {(["new", "refurbished", "used"] as const)
                        .filter((c) => pool.some((p) => p.condition === c))
                        .map((c) => (
                          <label key={c} className="flex items-center gap-2.5 text-sm capitalize text-marine-900">
                            <input type="checkbox" name="condition" value={c} defaultChecked={query.conditions?.includes(c)} className={checkbox} />
                            {c}
                          </label>
                        ))}
                    </div>
                  </fieldset>
                )}

                {specFilters.map(({ def, options }) => (
                  <fieldset key={def.key}>
                    <legend className="text-sm font-medium text-marine-900">{def.label}</legend>
                    <div className="mt-2 space-y-2">
                      {options.map((o) => (
                        <label key={o} className="flex items-center gap-2.5 text-sm text-marine-900">
                          <input
                            type="checkbox"
                            name={`spec.${def.key}`}
                            value={o}
                            defaultChecked={query.specs?.[def.key]?.includes(o)}
                            className={checkbox}
                          />
                          {def.type === "boolean" ? (o === "true" ? "Yes" : "No") : o}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}

                <label className="flex items-center gap-2.5 text-sm text-marine-900">
                  <input type="checkbox" name="stock" value="1" defaultChecked={query.inStock} className={checkbox} />
                  In stock only
                </label>

                <div className="flex gap-2">
                  <button type="submit" className="h-10 flex-1 rounded-full bg-marine-700 text-sm font-semibold text-white hover:bg-marine-800">
                    Apply filters
                  </button>
                  {activeCount > 0 && (
                    <Link href={withParams(basePath, params, { brand: undefined, condition: undefined, min: undefined, max: undefined, stock: undefined, page: undefined, ...Object.fromEntries(Object.keys(params).filter((k) => k.startsWith("spec.")).map((k) => [k, undefined])) })} className="flex h-10 items-center rounded-full border border-line px-4 text-sm text-marine-900 hover:border-marine-700">
                      Clear
                    </Link>
                  )}
                </div>
            </div>
          </form>

    </>
  );

  return (
    <>
      <section className="relative overflow-hidden bg-marine-900 text-white">
        {/* The category name floods the background and ghosts behind the H1. */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-6 select-none whitespace-nowrap text-center font-black leading-[0.8] tracking-tighter text-marine-800 text-[clamp(8rem,26vw,22rem)]"
        >
          {category ? category.name : "Shop"}
        </p>
        <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-16 sm:px-6 sm:pb-32 sm:pt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            {category ? "Category" : "The catalogue"}
          </p>
          <h1 className="mt-3 font-bold leading-[0.95] tracking-tight text-[clamp(2.5rem,7vw,5.5rem)]">
            {heading}
          </h1>
          {intro && (
            <p className="mt-5 max-w-xl text-base text-marine-200 sm:text-lg">{intro}</p>
          )}
        </div>
      </section>

      <div className="mx-auto -mt-8 max-w-7xl px-4 sm:px-6">
        <form
          action={basePath}
          role="search"
          className="relative flex items-center gap-3 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-line"
        >
          <label htmlFor="shop-q" className="sr-only">
            Search the shop
          </label>
          <input
            id="shop-q"
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder={category ? `Search in ${category.name}` : "Search all products"}
            className="h-11 min-w-0 flex-1 rounded-xl bg-transparent px-2 text-base focus:outline-none focus:ring-2 focus:ring-marine-100 sm:px-3 sm:text-sm"
          />
          {query.sort && query.sort !== "featured" && <input type="hidden" name="sort" value={query.sort} />}
          <button type="submit" className="h-11 shrink-0 rounded-full bg-marine-700 px-4 text-sm font-semibold text-white hover:bg-marine-800 sm:px-6">
            Search
          </button>
        </form>
      </div>

      {category && (
        <nav aria-label="Breadcrumb" className="mx-auto mt-6 max-w-7xl px-4 text-xs text-muted sm:px-6">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/shop" className="hover:text-marine-900">Shop</Link>
            </li>
            {breadcrumbPath.map((c, i, arr) => (
              <li key={c.id} className="flex items-center gap-1.5">
                <span aria-hidden="true">/</span>
                {i === arr.length - 1 ? (
                  <span aria-current="page" className="text-marine-900">{c.name}</span>
                ) : (
                  <Link href={`/category/${c.slug}`} className="hover:text-marine-900">{c.name}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mx-auto mt-8 grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[240px_1fr]">
        <details className="rounded-2xl border border-line px-4 py-3 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-marine-900 [&::-webkit-details-marker]:hidden">
            Categories &amp; filters{activeCount > 0 && ` (${activeCount})`}
            <span aria-hidden="true" className="text-xs font-normal text-muted">Show / hide</span>
          </summary>
          <div className="mt-5 space-y-8">{sidebar}</div>
        </details>
        <aside className="hidden space-y-8 lg:block" aria-label="Categories and filters">
          {sidebar}
        </aside>

        <section aria-label="Products" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {page.total} product{page.total === 1 ? "" : "s"}
              {query.q && <> for “{query.q}”</>}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted">Sort:</span>
              {sortOptions.map((s) => (
                <Link
                  key={s.value}
                  href={withParams(basePath, params, { sort: s.value === "featured" ? undefined : s.value, page: undefined })}
                  aria-current={query.sort === s.value ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full px-3 py-2 font-medium ${query.sort === s.value ? "bg-marine-700 text-white" : "bg-surface text-marine-900 hover:bg-marine-50"}`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          {page.items.length === 0 ? (
            <div className="mt-10 rounded-3xl bg-surface p-10 text-center">
              <h2 className="text-lg font-semibold text-marine-900">Nothing matched that</h2>
              <p className="mt-2 text-sm text-muted">
                Loosen a filter or try different words — the thing you want is probably hiding behind one of them.
              </p>
              <Link href={basePath} className="mt-5 inline-flex h-10 items-center rounded-full bg-marine-700 px-5 text-sm font-semibold text-white hover:bg-marine-800">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-8 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {page.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {page.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm">
              {page.page > 1 ? (
                <Link href={withParams(basePath, params, { page: page.page - 1 === 1 ? undefined : String(page.page - 1) })} className="font-medium text-marine-900 hover:underline">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <ul className="order-last flex w-full flex-wrap items-center justify-center gap-1 sm:order-none sm:w-auto">
                {Array.from({ length: page.totalPages }, (_, i) => i + 1).map((n) => (
                  <li key={n}>
                    <Link
                      href={withParams(basePath, params, { page: n === 1 ? undefined : String(n) })}
                      aria-current={n === page.page ? "page" : undefined}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${n === page.page ? "bg-marine-700 font-semibold text-white" : "text-marine-900 hover:bg-surface"}`}
                    >
                      {n}
                    </Link>
                  </li>
                ))}
              </ul>
              {page.page < page.totalPages ? (
                <Link href={withParams(basePath, params, { page: String(page.page + 1) })} className="font-medium text-marine-900 hover:underline">
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
