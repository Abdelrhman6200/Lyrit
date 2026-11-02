import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, priceRange } from "@/features/catalog/queries";
import { ProductGallery } from "@/components/product/gallery";
import { AddToCartForm } from "@/components/product/add-to-cart-form";
import { ProductGrid } from "@/components/product/product-card";
import { STORE_CURRENCY, minorToMajorString } from "@/lib/money";
import { absoluteUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  const description = product.seoDescription ?? product.shortDescription ?? undefined;
  return {
    title: product.seoTitle ?? product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description, images: product.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.altText })) },
  };
}

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line py-5" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-xl">
        {title}
        <span aria-hidden className="text-2xl font-light transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="prose-lyrit mt-4">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product);
  const range = priceRange(product.variants);
  const category = product.categories[0]?.category;
  const inStock = product.variants.some((v) => v.stockQuantity > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.images.map((i) => absoluteUrl(i.url)),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: "LYRIT" },
    offers: range && {
      "@type": "AggregateOffer",
      priceCurrency: STORE_CURRENCY,
      lowPrice: minorToMajorString(range.min),
      highPrice: minorToMajorString(range.max),
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/products/${product.slug}`),
    },
  };

  return (
    <div className="container-page py-8 lg:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <ol className="flex flex-wrap gap-1.5">
          <li><Link href="/" className="hover:text-forest">Home</Link> /</li>
          <li><Link href="/shop" className="hover:text-forest">Shop</Link> /</li>
          {category && <li><Link href={`/collections/${category.slug}`} className="hover:text-forest">{category.name}</Link> /</li>}
          <li aria-current="page" className="text-charcoal">{product.name}</li>
        </ol>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />
        <div className="lg:sticky lg:top-28 lg:self-start">
          {category && <p className="eyebrow">{category.name}</p>}
          <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          {product.shortDescription && <p className="mt-4 text-base leading-7 text-charcoal/80">{product.shortDescription}</p>}
          <div className="mt-8"><AddToCartForm variants={product.variants} currency={STORE_CURRENCY} /></div>

          {product.benefits.length > 0 && (
            <ul className="mt-8 grid gap-2 rounded-xl bg-white p-5 text-sm sm:grid-cols-2">
              {product.benefits.map((b) => (
                <li key={b} className="flex gap-2"><span aria-hidden className="text-forest">✦</span>{b}</li>
              ))}
            </ul>
          )}

          <div className="mt-8 border-t border-line">
            {product.description && (
              <Section title="Description" open>
                {product.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              </Section>
            )}
            {product.ingredients && <Section title="Ingredients"><p>{product.ingredients}</p></Section>}
            {product.usageInstructions && (
              <Section title="How to use">
                {product.usageInstructions.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
              </Section>
            )}
            {product.precautions && <Section title="Precautions"><p>{product.precautions}</p></Section>}
            <Section title="Shipping & returns">
              <p>Delivery across Egypt in 2–5 working days. Free shipping on qualifying orders. Unopened products can be returned within 14 days.</p>
              <p><Link href="/shipping-returns">Read our full shipping & returns policy</Link></p>
            </Section>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-10 text-center text-3xl sm:text-4xl">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
