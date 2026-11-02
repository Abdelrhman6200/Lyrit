import Link from "next/link";
import type { ProductCardData } from "@/features/catalog/queries";
import { priceRange } from "@/features/catalog/queries";
import { discountPercent, Price } from "@/components/ui/price";
import { Media } from "@/components/ui/media";
import { QuickAddButton } from "./quick-add-button";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const range = priceRange(product.variants);
  const [primary, secondary] = product.images;
  const inStock = product.variants.some((v) => v.stockQuantity > 0);
  const lowStock = inStock && product.variants.every((v) => v.stockQuantity <= v.lowStockThreshold);
  const pct = range ? discountPercent(range.min, range.compareAt) : null;
  const single = product.variants.length === 1 ? product.variants[0] : null;

  return (
    <article className="group relative flex flex-col">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-beige/50">
        {primary ? (
          <>
            <Media src={primary.url} alt={primary.altText} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" priority={priority} className="object-cover transition duration-500 group-hover:scale-[1.03]" />
            {secondary && (
              <Media src={secondary.url} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-serif text-muted">LYRIT</div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {pct && <span className="rounded-full bg-forest px-2.5 py-1 text-[11px] font-medium text-white">−{pct}%</span>}
          {!inStock && <span className="rounded-full bg-charcoal/85 px-2.5 py-1 text-[11px] font-medium text-white">Sold out</span>}
          {lowStock && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-charcoal">Low stock</span>}
        </div>
      </Link>
      <div className="mt-4 flex flex-1 flex-col">
        {product.categories[0] && <p className="eyebrow !tracking-[0.15em]">{product.categories[0].category.name}</p>}
        <h3 className="mt-1 font-serif text-xl leading-tight">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-forest">
            {product.name}
          </Link>
        </h3>
        {range && <Price amount={range.min} compareAt={range.compareAt} from={range.min !== range.max} className="mt-1.5 text-sm" />}
        <div className="relative z-10 mt-3">
          {single ? (
            <QuickAddButton variantId={single.id} disabled={!inStock} productName={product.name} />
          ) : (
            <Link href={`/products/${product.slug}`} className="btn-secondary w-full !py-2.5 text-xs">
              {inStock ? "Select options" : "View product"}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <div className="skeleton aspect-[4/5] !rounded-[var(--radius-card)]" />
          <div className="skeleton mt-4 h-3 w-1/3" />
          <div className="skeleton mt-2 h-5 w-3/4" />
          <div className="skeleton mt-2 h-4 w-1/4" />
        </li>
      ))}
    </ul>
  );
}
