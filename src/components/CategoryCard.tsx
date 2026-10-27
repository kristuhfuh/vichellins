import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Category } from "@/lib/types";
import { ProductVisual } from "./ProductVisual";

export function CategoryCard({ category, count, featured = false, index = 0 }: {
  category: Pick<Category, "name" | "slug" | "description" | "kind" | "imageUrl">;
  count: number;
  featured?: boolean;
  index?: number;
}) {
  const image = category.imageUrl || (category.kind === "phone" ? "/phones-lineup.jpg" : undefined);
  return (
    <Link
      href={`/category/${category.slug}`}
      className={`category-card group relative isolate block min-w-0 overflow-hidden rounded-3xl ${featured ? "bg-marine-700 text-white" : "bg-surface text-marine-900"}`}
      style={{ "--category-delay": `${index * 0.45}s` } as CSSProperties}
    >
      <div className="category-card-copy relative z-10 flex min-h-72 w-[56%] flex-col justify-between gap-8 py-7 pl-6 sm:py-9 sm:pl-8">
        <div>
          {featured && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">Featured</p>}
          <h3 className={`category-card-title break-words font-bold leading-tight tracking-tight ${featured ? "mt-3" : ""}`}>{category.name}</h3>
          <p className={`mt-3 break-words text-sm leading-relaxed ${featured ? "text-marine-100" : "text-muted"}`}>{category.description}</p>
        </div>
        <span className={`text-sm font-semibold ${featured ? "text-gold-400" : "text-marine-700"}`}>
          {count} product{count === 1 ? "" : "s"} <span aria-hidden="true">→</span>
        </span>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%]" aria-hidden="true">
        {image ? (
          <Image src={image} alt="" fill sizes="(min-width: 1280px) 560px, (min-width: 640px) 46vw, 50vw" className="object-contain object-right-bottom transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <ProductVisual kind={category.kind} tone={featured ? "#d0d0fc" : "#7272f4"} className="absolute bottom-0 right-0 h-full w-full transition-transform duration-300 group-hover:scale-105" />
        )}
      </div>
    </Link>
  );
}
