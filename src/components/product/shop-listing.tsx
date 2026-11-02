import Link from "next/link";
import type { Category } from "@prisma/client";
import { listProducts, type ShopSort } from "@/features/catalog/queries";
import { parseMajorToMinor } from "@/lib/money";
import { ProductGrid } from "./product-card";

export type SearchParams = Record<string, string | string[] | undefined>;

const SORTS: { value: ShopSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseShopParams(sp: SearchParams) {
  const sort = SORTS.some((s) => s.value === one(sp.sort)) ? (one(sp.sort) as ShopSort) : "featured";
  const min = one(sp.min) ? parseMajorToMinor(one(sp.min)) ?? undefined : undefined;
  const max = one(sp.max) ? parseMajorToMinor(one(sp.max)) ?? undefined : undefined;
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  return { sort, min, max, inStock: one(sp.stock) === "1", page, category: one(sp.category) || undefined };
}

export async function ShopListing({
  basePath,
  searchParams,
  categories,
  fixedCategorySlug,
  productIds,
  extraParams = {},
}: {
  basePath: string;
  searchParams: SearchParams;
  categories: Category[];
  fixedCategorySlug?: string;
  productIds?: string[];
  extraParams?: Record<string, string>;
}) {
  const f = parseShopParams(searchParams);
  const categorySlug = fixedCategorySlug ?? f.category;
  const result = await listProducts({
    categorySlug,
    minPriceMinor: f.min,
    maxPriceMinor: f.max,
    inStock: f.inStock,
    sort: f.sort,
    page: f.page,
    pageSize: 12,
    productIds,
  });
  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams(extraParams);
    const merged = { sort: f.sort !== "featured" ? f.sort : undefined, min: one(searchParams.min) || undefined, max: one(searchParams.max) || undefined, stock: f.inStock ? "1" : undefined, category: fixedCategorySlug ? undefined : f.category, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const hasFilters = !!(f.min || f.max || f.inStock || (!fixedCategorySlug && f.category));

  return (
    <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
      <aside aria-label="Filters">
        <details className="group rounded-xl border border-line bg-white p-4 lg:border-0 lg:bg-transparent lg:p-0" open>
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium lg:hidden">
            Filter & sort <span className="text-muted group-open:hidden">Show</span><span className="hidden text-muted group-open:inline">Hide</span>
          </summary>
          <form method="get" action={basePath} className="mt-4 space-y-8 lg:mt-0">
            {Object.entries(extraParams).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            {!fixedCategorySlug && (
              <fieldset>
                <legend className="eyebrow mb-3">Category</legend>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2"><input type="radio" name="category" value="" defaultChecked={!f.category} className="accent-forest" /> All</label>
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2">
                      <input type="radio" name="category" value={c.slug} defaultChecked={f.category === c.slug} className="accent-forest" /> {c.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset>
              <legend className="eyebrow mb-3">Price (EGP)</legend>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="min">Minimum price</label>
                <input id="min" name="min" inputMode="decimal" placeholder="Min" defaultValue={one(searchParams.min)} className="input !py-2" />
                <span aria-hidden>–</span>
                <label className="sr-only" htmlFor="max">Maximum price</label>
                <input id="max" name="max" inputMode="decimal" placeholder="Max" defaultValue={one(searchParams.max)} className="input !py-2" />
              </div>
            </fieldset>
            <fieldset>
              <legend className="eyebrow mb-3">Availability</legend>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="stock" value="1" defaultChecked={f.inStock} className="h-4 w-4 accent-forest" /> In stock only</label>
            </fieldset>
            <fieldset>
              <legend className="eyebrow mb-3">Sort by</legend>
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select id="sort" name="sort" defaultValue={f.sort} className="input !py-2">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </fieldset>
            <div className="flex gap-2">
              <button className="btn-primary flex-1 !py-2.5">Apply</button>
              {hasFilters && <Link href={qs({ min: undefined, max: undefined, stock: undefined, category: undefined, page: undefined })} className="btn-secondary !py-2.5">Reset</Link>}
            </div>
          </form>
        </details>
      </aside>
      <div>
        <p className="mb-6 text-sm text-muted" role="status">{result.total} product{result.total === 1 ? "" : "s"}</p>
        {result.items.length ? (
          <ProductGrid products={result.items} priorityCount={4} />
        ) : (
          <div className="rounded-xl bg-white px-6 py-16 text-center">
            <h2 className="text-2xl">No products match your filters</h2>
            <p className="mt-2 text-sm text-muted">Try adjusting the price range or availability.</p>
            <Link href={basePath + (Object.keys(extraParams).length ? `?${new URLSearchParams(extraParams)}` : "")} className="btn-secondary mt-6">Clear filters</Link>
          </div>
        )}
        {result.pageCount > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
            {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={qs({ page: n > 1 ? String(n) : undefined })} aria-current={n === result.page ? "page" : undefined} className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ${n === result.page ? "bg-forest text-white" : "hover:bg-beige"}`}>
                {n}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
