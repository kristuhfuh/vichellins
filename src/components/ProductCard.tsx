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

export function ProductCard({ product }: { product: Product }) {
  const href = `/product/${product.slug}`;
  const kind = getProductKind(product);
  const category = getCategoryById(product.categoryId);
  const brand = getBrandById(product.brandId);
  const soldOut = !isInStock(product);
  const min = getMinPrice(product);
  const hasRange = getMaxPrice(product) !== min;
  const single = product.variants.length === 1 ? getDefaultVariant(product) : undefined;
  const onSale = product.variants.some(
    (v) => v.price === min && v.compareAtPrice && v.compareAtPrice > v.price,
  );

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
      }
    : null;

  return (
    <article className="group flex flex-col">
      <Link href={href} className="relative block aspect-square overflow-hidden rounded-3xl bg-surface">
        <div className="absolute left-3 top-3 z-10 flex gap-1.5">
          {product.condition !== "new" && (
            <span className="rounded-full bg-gold-400 px-2.5 py-1 text-[11px] font-semibold capitalize text-marine-900">
              {product.condition}
            </span>
          )}
          {onSale && !soldOut && (
            <span className="rounded-full bg-marine-900 px-2.5 py-1 text-[11px] font-semibold text-white">Sale</span>
          )}
        </div>
        {category && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-marine-900">
            {category.name}
          </span>
        )}
        <ProductVisual
          kind={kind}
          tone={product.tone}
          className={`h-full w-full p-8 transition-transform duration-300 group-hover:scale-105 ${soldOut ? "opacity-40" : ""}`}
        />
      </Link>
      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-xs text-muted">{brand?.name}</p>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-marine-900">
            <Link href={href} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          <p className="shrink-0 text-sm font-semibold text-marine-900">
            {hasRange && <span className="mr-1 text-xs font-normal text-muted">From</span>}
            {formatPrice(min)}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted">
          {product.warranty.months > 0 ? `${product.warranty.months} month warranty` : "No warranty"}
          {" · "}
          {soldOut ? "Out of stock" : "In stock"}
        </p>
        <div className="mt-4 flex gap-2">
          <CardActions href={href} item={cartItem} soldOut={soldOut} />
        </div>
      </div>
    </article>
  );
}
