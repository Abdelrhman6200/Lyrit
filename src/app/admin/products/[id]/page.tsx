import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireStaff("products:manage");
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [product, categories, products] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } }, variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } }, categories: true, related: { orderBy: { sortOrder: "asc" } } },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" }, id: { not: id } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/products" className="underline">← Products</Link></p>
      <PageHeader title={product.name} actions={product.status === "PUBLISHED" && <Link href={`/products/${product.slug}`} target="_blank" className="btn-secondary !py-2">View on store ↗</Link>} />
      {created && <p role="status" className="mb-6 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">Product created.</p>}
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        allProducts={products}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          benefits: product.benefits.join("\n"),
          ingredients: product.ingredients ?? "",
          usageInstructions: product.usageInstructions ?? "",
          precautions: product.precautions ?? "",
          tags: product.tags.join(", "),
          status: product.status,
          isFeatured: product.isFeatured,
          featuredOrder: product.featuredOrder,
          seoTitle: product.seoTitle ?? "",
          seoDescription: product.seoDescription ?? "",
          categoryIds: product.categories.map((c) => c.categoryId),
          relatedIds: product.related.map((r) => r.relatedId),
          images: product.images.map((i) => ({ id: i.id, url: i.url, altText: i.altText })),
          variants: product.variants.map((v) => ({ id: v.id, sku: v.sku, variantName: v.variantName, priceMinor: v.priceMinor, compareAtPriceMinor: v.compareAtPriceMinor, stockQuantity: v.stockQuantity, lowStockThreshold: v.lowStockThreshold, isActive: v.isActive })),
        }}
      />
    </>
  );
}
