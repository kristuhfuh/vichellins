import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/ShopView";
import { getCategories, getCategoryBySlug } from "@/lib/catalog";

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};
  return { title: category.name, description: category.description };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  return (
    <ShopView
      basePath={`/category/${category.slug}`}
      params={query}
      category={category}
      heading={category.name}
      intro={category.description}
    />
  );
}
