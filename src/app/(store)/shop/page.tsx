import type { Metadata } from "next";
import { getVisibleCategories } from "@/features/catalog/queries";
import { ShopListing, type SearchParams } from "@/components/product/shop-listing";

export const metadata: Metadata = { title: "Shop all", description: "Shop the full LYRIT hair care collection.", alternates: { canonical: "/shop" } };

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [sp, categories] = await Promise.all([searchParams, getVisibleCategories()]);
  return (
    <div className="container-page py-12">
      <header className="mb-10 text-center">
        <p className="eyebrow">The collection</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Shop all</h1>
      </header>
      <ShopListing basePath="/shop" searchParams={sp} categories={categories} />
    </div>
  );
}
