import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const productCardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 2 },
  variants: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { priceMinor: "asc" }] },
  categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export const PUBLISHED: Prisma.ProductWhereInput = { status: "PUBLISHED" };

export async function getVisibleCategories() {
  return db.category.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function getCategoryBySlug(slug: string) {
  return db.category.findFirst({ where: { slug, isVisible: true } });
}

export async function getFeaturedProducts(limit = 8) {
  return db.product.findMany({
    where: { ...PUBLISHED, isFeatured: true },
    include: productCardInclude,
    orderBy: [{ featuredOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export type ShopSort = "featured" | "newest" | "price-asc" | "price-desc";

export type ShopFilters = {
  categorySlug?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  inStock?: boolean;
  sort?: ShopSort;
  page?: number;
  pageSize?: number;
  productIds?: string[];
};

/**
 * Lists published products with filters. Price filtering and sorting use the lowest active variant
 * price via a SQL aggregate so pagination stays correct.
 */
export async function listProducts(filters: ShopFilters) {
  const pageSize = Math.min(filters.pageSize ?? 12, 48);
  const page = Math.max(1, filters.page ?? 1);

  const conditions: Prisma.Sql[] = [Prisma.sql`p.status = 'PUBLISHED'`];
  if (filters.categorySlug) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM product_categories pc JOIN categories c ON c.id = pc.category_id
      WHERE pc.product_id = p.id AND c.is_visible AND (c.slug = ${filters.categorySlug}
        OR c.parent_id IN (SELECT id FROM categories WHERE slug = ${filters.categorySlug})))`);
  }
  if (filters.productIds) {
    if (filters.productIds.length === 0) return { items: [], total: 0, page, pageSize, pageCount: 0 };
    conditions.push(Prisma.sql`p.id::text IN (${Prisma.join(filters.productIds)})`);
  }
  const having: Prisma.Sql[] = [Prisma.sql`COUNT(v.id) > 0`];
  if (filters.minPriceMinor !== undefined) having.push(Prisma.sql`MIN(v.price_minor) >= ${filters.minPriceMinor}`);
  if (filters.maxPriceMinor !== undefined) having.push(Prisma.sql`MIN(v.price_minor) <= ${filters.maxPriceMinor}`);
  if (filters.inStock) having.push(Prisma.sql`SUM(v.stock_quantity) > 0`);

  const order = {
    featured: Prisma.sql`p.is_featured DESC, p.featured_order ASC, p.created_at DESC`,
    newest: Prisma.sql`p.created_at DESC`,
    "price-asc": Prisma.sql`MIN(v.price_minor) ASC, p.created_at DESC`,
    "price-desc": Prisma.sql`MIN(v.price_minor) DESC, p.created_at DESC`,
  }[filters.sort ?? "featured"];

  const base = Prisma.sql`
    FROM products p JOIN product_variants v ON v.product_id = p.id AND v.is_active
    WHERE ${Prisma.join(conditions, " AND ")}
    GROUP BY p.id
    HAVING ${Prisma.join(having, " AND ")}`;

  const [rows, countRows] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`SELECT p.id::text AS id ${base} ORDER BY ${order} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM (SELECT p.id ${base}) t`,
  ]);
  const ids = rows.map((r) => r.id);
  const products = await db.product.findMany({ where: { id: { in: ids } }, include: productCardInclude });
  const byId = new Map(products.map((p) => [p.id, p]));
  const total = Number(countRows[0]?.count ?? 0);
  return {
    items: ids.map((id) => byId.get(id)).filter((p): p is ProductCardData => !!p),
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

/** PostgreSQL full-text search over name, description, tags, ingredients and category names. */
export async function searchProductIds(query: string, limit = 48): Promise<string[]> {
  const q = query.trim().slice(0, 100);
  if (!q) return [];
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p.id::text AS id
    FROM products p
    LEFT JOIN product_categories pc ON pc.product_id = p.id
    LEFT JOIN categories c ON c.id = pc.category_id
    WHERE p.status = 'PUBLISHED'
    GROUP BY p.id
    HAVING
      (p.search_vector || to_tsvector('simple', COALESCE(string_agg(c.name, ' '), '')))
        @@ websearch_to_tsquery('simple', ${q})
      OR p.name ILIKE ${"%" + q + "%"}
    ORDER BY ts_rank(p.search_vector, websearch_to_tsquery('simple', ${q})) DESC, p.name ASC
    LIMIT ${limit}`;
  return rows.map((r) => r.id);
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, ...PUBLISHED },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { priceMinor: "asc" }] },
      categories: { include: { category: true } },
      related: {
        orderBy: { sortOrder: "asc" },
        include: { related: { include: productCardInclude } },
      },
    },
  });
}

export async function getRelatedProducts(
  product: { id: string; tags: string[]; categories: { categoryId: string }[]; related: { related: ProductCardData }[] },
  limit = 4,
) {
  const manual = product.related.map((r) => r.related).filter((p) => p.status === "PUBLISHED");
  if (manual.length >= limit) return manual.slice(0, limit);
  const exclude = [product.id, ...manual.map((p) => p.id)];
  const auto = await db.product.findMany({
    where: {
      ...PUBLISHED,
      id: { notIn: exclude },
      OR: [
        { categories: { some: { categoryId: { in: product.categories.map((c) => c.categoryId) } } } },
        ...(product.tags.length ? [{ tags: { hasSome: product.tags } }] : []),
      ],
    },
    include: productCardInclude,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit - manual.length,
  });
  return [...manual, ...auto];
}

export function priceRange(variants: { priceMinor: number; compareAtPriceMinor: number | null }[]) {
  if (!variants.length) return null;
  const prices = variants.map((v) => v.priceMinor);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const cheapest = variants.find((v) => v.priceMinor === min)!;
  return { min, max, compareAt: cheapest.compareAtPriceMinor && cheapest.compareAtPriceMinor > min ? cheapest.compareAtPriceMinor : null };
}
