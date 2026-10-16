import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductPurchase } from "@/components/ProductPurchase";
import {
  getAllProducts,
  getBrandById,
  getCategoryPath,
  getMaxPrice,
  getMinPrice,
  getProductBySlug,
  getProductKind,
  getRelatedProducts,
  getSpecDefinitions,
  isInStock,
  optionKey,
} from "@/lib/catalog";
import { deliveryZones, store } from "@/lib/config";
import { formatPrice, warrantyLabel } from "@/lib/format";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  const brand = getBrandById(product.brandId)?.name;
  const description = `${product.description} From ${formatPrice(getMinPrice(product))}. ${warrantyLabel(product.warranty.months, product.warranty.type)}.`;
  return {
    title: `${product.name}${brand ? ` by ${brand}` : ""}`,
    description,
    openGraph: { title: product.name, description, type: "website" },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const brand = getBrandById(product.brandId);
  const path = getCategoryPath(product.categoryId);
  const kind = getProductKind(product);
  // Specs the shopper chooses as options (RAM, storage…) are shown in the buy box, not as a fixed row.
  const optionKeys = new Set(product.options.map((o) => optionKey(o.name)));
  const specs = getSpecDefinitions(product.categoryId)
    .map((def) => ({ def, value: product.specs[def.key] }))
    .filter((s) => s.value !== undefined && !optionKeys.has(s.def.key));
  const related = getRelatedProducts(product);
  const fastest = deliveryZones[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: brand ? { "@type": "Brand", name: brand.name } : undefined,
    itemCondition: `https://schema.org/${product.condition === "new" ? "NewCondition" : product.condition === "refurbished" ? "RefurbishedCondition" : "UsedCondition"}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "NGN",
      lowPrice: getMinPrice(product),
      highPrice: getMaxPrice(product),
      offerCount: product.variants.length,
      availability: isInStock(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${store.siteUrl}/product/${product.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        // Escaping "<" stops product text from closing the script tag early.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/shop" className="hover:text-marine-900">Shop</Link></li>
          {path.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              <Link href={`/category/${c.slug}`} className="hover:text-marine-900">{c.name}</Link>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-marine-900">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="mb-6">
        {brand && <p className="text-sm text-muted">{brand.name}</p>}
        <h1 className="text-3xl font-semibold tracking-tight text-marine-900 sm:text-4xl">{product.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-marine-50 px-3 py-1 text-xs font-semibold capitalize text-marine-800">{product.condition}</span>
          {product.authenticity.status === "verified" && (
            <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700">✓ Authenticity verified</span>
          )}
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-marine-900">
            {warrantyLabel(product.warranty.months, product.warranty.type)}
          </span>
        </div>
      </div>

      <ProductPurchase product={product} kind={kind}>
        <ul className="mt-8 space-y-2.5 border-t border-line pt-6">
          {product.highlights.map((h) => (
            <li key={h} className="flex gap-2.5 text-sm text-marine-900">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
              {h}
            </li>
          ))}
        </ul>
      </ProductPurchase>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section aria-labelledby="about">
            <h2 id="about" className="text-xl font-semibold text-marine-900">About this product</h2>
            <p className="mt-3 max-w-prose leading-relaxed text-muted">{product.description}</p>
          </section>

          {specs.length > 0 && (
            <section aria-labelledby="specs">
              <h2 id="specs" className="text-xl font-semibold text-marine-900">Specifications</h2>
              <dl className="mt-4 divide-y divide-line rounded-2xl border border-line">
                {specs.map(({ def, value }) => (
                  <div key={def.key} className="grid grid-cols-2 gap-4 px-5 py-3 text-sm">
                    <dt className="text-muted">{def.label}</dt>
                    <dd className="font-medium text-marine-900">
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
                      {def.unit && typeof value === "number" ? ` ${def.unit}` : ""}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside className="space-y-4" aria-label="Warranty, authenticity and delivery">
          <div className="rounded-2xl border border-line p-5">
            <h2 className="text-sm font-semibold text-marine-900">Warranty</h2>
            <p className="mt-1 text-sm font-medium text-marine-800">
              {warrantyLabel(product.warranty.months, product.warranty.type)}
            </p>
            {product.warranty.notes && <p className="mt-1 text-sm text-muted">{product.warranty.notes}</p>}
            <Link href="/warranty" className="mt-2 inline-block text-xs font-medium text-marine-700 underline">How warranty claims work</Link>
          </div>
          <div className="rounded-2xl border border-line p-5">
            <h2 className="text-sm font-semibold text-marine-900">Authenticity</h2>
            <p className="mt-1 text-sm font-medium text-marine-800">
              {product.authenticity.status === "verified" ? "Verified genuine" : "Not yet verified"}
            </p>
            {product.authenticity.notes && <p className="mt-1 text-sm text-muted">{product.authenticity.notes}</p>}
          </div>
          <div className="rounded-2xl border border-line p-5">
            <h2 className="text-sm font-semibold text-marine-900">Delivery in Lagos</h2>
            <p className="mt-1 text-sm text-muted">
              From {formatPrice(Math.min(...deliveryZones.map((z) => z.fee)))}, usually {fastest.eta.toLowerCase()} on the mainland. Inspect your item before you pay if you choose pay on delivery.
            </p>
            <Link href="/delivery-returns" className="mt-2 inline-block text-xs font-medium text-marine-700 underline">Delivery details</Link>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-20">
          <h2 id="related" className="text-2xl font-semibold tracking-tight text-marine-900">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
