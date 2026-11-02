import type { Metadata } from "next";
import Link from "next/link";
import { getVisibleCategories, searchProductIds } from "@/features/catalog/queries";
import { ShopListing, type SearchParams } from "@/components/product/shop-listing";
import { SearchIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? "";
  const [ids, categories] = await Promise.all([q ? searchProductIds(q) : Promise.resolve(null), getVisibleCategories()]);

  return (
    <div className="container-page py-12">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="text-4xl sm:text-5xl">Search</h1>
        <form method="get" action="/search" role="search" className="relative mt-8">
          <label htmlFor="q" className="sr-only">Search products</label>
          <input id="q" name="q" type="search" defaultValue={q} autoFocus={!q} placeholder="Search shampoos, oils, ingredients…" className="input !rounded-full !py-4 !pl-6 !pr-14" />
          <button className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-forest text-white" aria-label="Search">
            <SearchIcon width={18} />
          </button>
        </form>
      </header>
      {ids === null ? (
        <div className="text-center">
          <p className="text-sm text-muted">Popular categories</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <li key={c.id}><Link href={`/collections/${c.slug}`} className="btn-secondary !py-2 text-xs">{c.name}</Link></li>
            ))}
          </ul>
        </div>
      ) : ids.length === 0 ? (
        <div className="mx-auto max-w-md rounded-xl bg-white px-6 py-14 text-center">
          <h2 className="text-2xl">No results for “{q}”</h2>
          <p className="mt-2 text-sm text-muted">Check the spelling, try a more general term, or browse our categories.</p>
          <Link href="/shop" className="btn-primary mt-6">Browse all products</Link>
        </div>
      ) : (
        <ShopListing basePath="/search" searchParams={sp} categories={categories} productIds={ids} extraParams={{ q }} />
      )}
    </div>
  );
}
