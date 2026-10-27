import type { Metadata } from "next";
import { ShopView } from "@/components/ShopView";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse phones, laptops, audio, smart home and more. Genuine products with warranty, delivered across Lagos.",
};

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const params = await searchParams;
  return (
    <ShopView
      basePath="/shop"
      params={params}
      heading="Everything you need."
      intro="Phones, laptops, audio, smart home — real stock, real warranty, delivered across Lagos."
    />
  );
}
