import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getVisibleCategories } from "@/features/catalog/queries";
import { ShopListing, type SearchParams } from "@/components/product/shop-listing";
import { Media } from "@/components/ui/media";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) notFound();
  return {
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description ?? undefined,
    alternates: { canonical: `/collections/${category.slug}` },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [category, sp, categories] = await Promise.all([getCategoryBySlug(slug), searchParams, getVisibleCategories()]);
  if (!category) notFound();
  return (
    <div className="container-page py-12">
      <header className="relative mb-12 overflow-hidden rounded-[1.5rem] bg-beige px-6 py-14 text-center sm:py-20">
        {category.bannerUrl && <Media src={category.bannerUrl} alt="" fill priority sizes="100vw" className="object-cover opacity-40" />}
        <div className="relative">
          <p className="eyebrow">Collection</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{category.name}</h1>
          {category.description && <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-charcoal/80">{category.description}</p>}
        </div>
      </header>
      <ShopListing basePath={`/collections/${slug}`} searchParams={sp} categories={categories} fixedCategorySlug={slug} />
    </div>
  );
}
