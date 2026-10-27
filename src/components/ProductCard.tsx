import Image from "next/image";
import Link from "next/link";
import {
  getBrandById,
  getCategoryById,
  getDefaultVariant,
  getMaxPrice,
  getMinPrice,
  getProductKind,
  isInStock,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { CardActions } from "./CardActions";
import { ProductVisual } from "./ProductVisual";

export async function ProductCard({
  product,
  prominent = false,
}: {
  product: Product;
  /** Hero-sized variant used on home-page featured sections. */
  prominent?: boolean;
}) {
  const href = `/product/${product.slug}`;
  const kind = getProductKind(product);
  const [category, brand] = await Promise.all([
    getCategoryById(product.categoryId),
    getBrandById(product.brandId),
  ]);
  const soldOut = !isInStock(product);
  const min = getMinPrice(product);
  const hasRange = getMaxPrice(product) !== min;
  const single = product.variants.length === 1 ? getDefaultVariant(product) : undefined;
  const onSale = product.variants.some(
    (v) => v.price === min && v.compareAtPrice && v.compareAtPrice > v.price,
  );
  const primaryImage = product.images[0];

  const cartItem = single
    ? {
        variantId: single.id,
        slug: product.slug,
        name: product.name,
        variantLabel: Object.values(single.optionValues).join(" / "),
        price: single.price,
        maxQty: single.stock,
        kind,
        tone: product.tone,
        image: primaryImage?.url,
      }
    : null;

  return (
    <article className="@container group flex h-full min-w-0 flex-col">
      <Link
        href={href}
        aria-label={`${product.name}${soldOut ? " – out of stock" : ""}`}
        className={`relative block aspect-[5/4] overflow-hidden ${
          prominent ? "rounded-[2rem] bg-marine-50" : "rounded-3xl bg-surface"
        }`}
      >
        <div className="absolute left-3 top-3 z-10 flex gap-1.5">
          {product.condition !== "new" && (
            <span className="rounded-full bg-gold-400 px-2.5 py-1 text-[11px] font-semibold capitalize text-marine-900">
              {product.condition}
            </span>
          )}
          {onSale && !soldOut && (
            <span className="rounded-full bg-marine-900 px-2.5 py-1 text-[11px] font-semibold text-white">Sale</span>
          )}
          {prominent && (
            <span className="rounded-full bg-marine-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-300">
              Favourite
            </span>
          )}
        </div>
        {category && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-marine-900">
            {category.name}
          </span>
        )}
        {primaryImage ? (
          <div className="absolute inset-4 sm:inset-5">
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt || product.name}
              fill
              sizes={prominent ? "(min-width: 1024px) 640px, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"}
              className={`object-contain transition-transform duration-300 group-hover:scale-[1.03] ${soldOut ? "opacity-40" : ""}`}
            />
          </div>
        ) : (
          <ProductVisual
            kind={kind}
            tone={product.tone}
            className={`h-full w-full transition-transform duration-300 group-hover:scale-105 ${
              prominent ? "p-16" : "p-8"
            } ${soldOut ? "opacity-40" : ""}`}
          />
        )}
      </Link>
      <div className={`flex flex-1 flex-col ${prominent ? "mt-5" : "mt-3"}`}>
        <p className={`text-muted ${prominent ? "text-sm" : "text-xs"}`}>{brand?.name}</p>
        <div className="flex min-w-0 flex-col items-start gap-1.5 @min-[22rem]:flex-row @min-[22rem]:justify-between @min-[22rem]:gap-3">
          <h3
            className={`min-w-0 break-words text-marine-900 ${
              prominent ? "font-bold text-xl leading-tight tracking-tight sm:text-2xl" : "text-sm font-semibold"
            }`}
          >
            <Link href={href} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          <p
            className={`shrink-0 font-semibold tabular-nums text-marine-900 ${
              prominent ? "text-xl sm:text-2xl" : "text-sm"
            }`}
          >
            {hasRange && (
              <span
                className={`mr-1 font-normal text-muted ${prominent ? "text-sm" : "text-xs"}`}
              >
                From
              </span>
            )}
            {formatPrice(min)}
          </p>
        </div>
        <p className={`text-muted ${prominent ? "mt-2 text-sm" : "mt-1 text-xs"}`}>
          {product.warranty.months > 0 ? `${product.warranty.months} month warranty` : "No warranty"}
          {" · "}
          {soldOut ? "Out of stock" : "In stock"}
        </p>
        <div className={`flex flex-wrap gap-2 ${prominent ? "mt-5" : "mt-3"}`}>
          <CardActions href={href} item={cartItem} soldOut={soldOut} />
        </div>
      </div>
    </article>
  );
}
