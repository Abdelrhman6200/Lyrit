import Link from "next/link";
import { getFeaturedProducts, getVisibleCategories } from "@/features/catalog/queries";
import { getBenefits, getHero, getPromos } from "@/features/content/queries";
import { BenefitsSection, CategoriesSection, HeroSection, PromoSection } from "@/components/home/sections";
import { ProductGrid } from "@/components/product/product-card";
import { NewsletterForm } from "@/components/home/newsletter-form";


export default async function HomePage() {
  const [hero, categories, benefits, featured, promos] = await Promise.all([
    getHero(),
    getVisibleCategories(),
    getBenefits(),
    getFeaturedProducts(8),
    getPromos(),
  ]);

  return (
    <>
      {hero && <HeroSection hero={hero} />}
      <CategoriesSection categories={categories.filter((c) => !c.parentId)} />
      {benefits && <BenefitsSection benefits={benefits} />}

      {featured.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="featured-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Curated for you</p>
              <h2 id="featured-heading" className="mt-2 text-3xl sm:text-4xl">Featured products</h2>
            </div>
            <Link href="/shop" className="hidden text-sm underline underline-offset-4 hover:text-forest sm:block">View all</Link>
          </div>
          <div className="mt-10"><ProductGrid products={featured} /></div>
          <div className="mt-10 text-center sm:hidden"><Link href="/shop" className="btn-secondary">View all products</Link></div>
        </section>
      )}

      <PromoSection promos={promos} />

      <section className="container-page mt-24" aria-labelledby="newsletter-heading">
        <div className="mx-auto max-w-2xl rounded-[1.5rem] bg-beige px-6 py-14 text-center sm:px-12">
          <p className="eyebrow">Newsletter</p>
          <h2 id="newsletter-heading" className="mt-2 text-3xl sm:text-4xl">Rituals, launches & offers</h2>
          <p className="mt-3 text-sm text-charcoal/75">Be the first to know about new LYRIT products and members-only offers.</p>
          <div className="mx-auto max-w-md text-left"><NewsletterForm source="home" /></div>
        </div>
      </section>
    </>
  );
}
