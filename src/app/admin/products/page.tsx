import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Badge, PageHeader, Pagination, Table } from "@/components/admin/ui";
import { Media } from "@/components/ui/media";
import { setProductStatusAction } from "@/features/admin/product-actions";

export const metadata = { title: "Products" };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireStaff("products:manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {};
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { variants: { some: { sku: { contains: sp.q, mode: "insensitive" } } } }];
  if (sp.status === "DRAFT" || sp.status === "PUBLISHED" || sp.status === "ARCHIVED") where.status = sp.status;
  else where.status = { not: "ARCHIVED" };
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { where: { isActive: true } }, categories: { include: { category: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * 25,
      take: 25,
    }),
    db.product.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Products" description={`${total} products`} actions={<Link href="/admin/products/new" className="btn-primary !py-2">Add product</Link>} />
      <form className="card mb-6 flex flex-wrap gap-3 p-4">
        <input name="q" defaultValue={sp.q} placeholder="Search name or SKU" className="input !w-auto flex-1 !py-2" aria-label="Search products" />
        <select name="status" defaultValue={sp.status ?? ""} className="input !w-auto !py-2" aria-label="Status">
          <option value="">Active (draft + published)</option><option>PUBLISHED</option><option>DRAFT</option><option>ARCHIVED</option>
        </select>
        <button className="btn-primary !py-2">Filter</button>
      </form>
      <Table head={["", "Product", "Status", "Categories", "Price", "Stock", ""]} empty="No products found.">
        {products.map((p) => {
          const stock = p.variants.reduce((s, v) => s + v.stockQuantity, 0);
          const prices = p.variants.map((v) => v.priceMinor);
          return (
            <tr key={p.id}>
              <td className="w-16 px-4 py-3"><div className="relative h-14 w-12 overflow-hidden rounded bg-beige">{p.images[0] && <Media src={p.images[0].url} alt="" fill sizes="48px" className="object-cover" />}</div></td>
              <td className="px-4 py-3"><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>{p.isFeatured && <span className="ml-2"><Badge>Featured</Badge></span>}<span className="block text-xs text-muted">{p.variants.length} variant(s)</span></td>
              <td className="px-4 py-3"><Badge tone={p.status === "PUBLISHED" ? "green" : p.status === "DRAFT" ? "amber" : "dark"}>{p.status}</Badge></td>
              <td className="px-4 py-3 text-xs">{p.categories.map((c) => c.category.name).join(", ") || "—"}</td>
              <td className="px-4 py-3">{prices.length ? formatMoney(Math.min(...prices)) : "—"}</td>
              <td className="px-4 py-3"><Badge tone={stock === 0 ? "red" : p.variants.some((v) => v.stockQuantity <= v.lowStockThreshold) ? "amber" : "green"}>{stock}</Badge></td>
              <td className="px-4 py-3 text-right">
                <form action={setProductStatusAction} className="inline">
                  <input type="hidden" name="id" value={p.id} />
                  {p.status === "ARCHIVED" ? <button name="status" value="DRAFT" className="text-xs underline">Restore</button> : <button name="status" value="ARCHIVED" className="text-xs text-muted underline">Archive</button>}
                </form>
              </td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={page} pageCount={Math.ceil(total / 25)} href={(p) => `/admin/products?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), page: String(p) })}`} />
    </>
  );
}
