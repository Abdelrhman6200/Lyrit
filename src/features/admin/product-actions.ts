"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { STORE_CURRENCY } from "@/lib/money";
import { fieldErrors } from "@/lib/validation";
import { adjustStock } from "@/features/inventory/service";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

const variantSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  sku: z.string().trim().min(2, "SKU required").max(64).regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, . _ - only"),
  variantName: z.string().trim().min(1, "Name required").max(60),
  priceMinor: z.number().int().min(0),
  compareAtPriceMinor: z.number().int().min(0).nullable(),
  stockQuantity: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
});

const imageSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  url: z.string().trim().min(1).max(500).refine((u) => u.startsWith("/") || u.startsWith("https://"), "Invalid image URL"),
  altText: z.string().trim().min(1, "Alt text required").max(200),
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(10_000).optional().or(z.literal("")),
  benefits: z.string().max(3000),
  ingredients: z.string().trim().max(5000).optional().or(z.literal("")),
  usageInstructions: z.string().trim().max(3000).optional().or(z.literal("")),
  precautions: z.string().trim().max(3000).optional().or(z.literal("")),
  tags: z.string().max(500),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isFeatured: z.boolean(),
  featuredOrder: z.number().int().min(0).max(999),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(170).optional().or(z.literal("")),
  categoryIds: z.array(z.string().uuid()),
  relatedIds: z.array(z.string().uuid()).max(8),
  variants: z.array(variantSchema).min(1, "Add at least one variant"),
  images: z.array(imageSchema).max(12),
});

export type ProductFormState = { error?: string; fieldErrors?: Record<string, string>; success?: string } | undefined;

/** PRD rule 14: published products must have description, image(s) and price. */
function publishReadiness(p: z.infer<typeof productSchema>): string | null {
  if (p.status !== "PUBLISHED") return null;
  if (!p.description && !p.shortDescription) return "Add a description before publishing.";
  if (p.images.length === 0) return "Add at least one image before publishing.";
  if (!p.variants.some((v) => v.isActive && v.priceMinor > 0)) return "Add an active variant with a price before publishing.";
  if (p.categoryIds.length === 0) return "Assign at least one category before publishing.";
  return null;
}

export async function saveProductAction(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const actor = await assertPermission("products:manage");
  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Invalid form data." };
  }
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const p = parsed.data;
  const readiness = publishReadiness(p);
  if (readiness) return { error: readiness };
  const skus = p.variants.map((v) => v.sku.toUpperCase());
  if (new Set(skus).size !== skus.length) return { error: "Each variant needs a unique SKU." };
  for (const v of p.variants)
    if (v.compareAtPriceMinor !== null && v.compareAtPriceMinor <= v.priceMinor && v.compareAtPriceMinor !== 0)
      return { error: `Compare-at price for ${v.variantName} must be higher than its price.` };

  const id = String(formData.get("id") ?? "") || null;
  const slug = slugify(p.slug || p.name);
  if (!slug) return { fieldErrors: { slug: "Slug required" } };

  const data = {
    name: p.name,
    slug,
    shortDescription: p.shortDescription || null,
    description: p.description || null,
    benefits: lines(p.benefits),
    ingredients: p.ingredients || null,
    usageInstructions: p.usageInstructions || null,
    precautions: p.precautions || null,
    tags: p.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    status: p.status,
    isFeatured: p.isFeatured,
    featuredOrder: p.featuredOrder,
    seoTitle: p.seoTitle || null,
    seoDescription: p.seoDescription || null,
  };

  let productId: string;
  try {
    productId = await db.$transaction(async (tx) => {
      const existing = id ? await tx.product.findUnique({ where: { id } }) : null;
      if (id && !existing) throw new Error("Product not found");
      const publishedAt = p.status === "PUBLISHED" ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null;
      const product = existing
        ? await tx.product.update({ where: { id: existing.id }, data: { ...data, publishedAt } })
        : await tx.product.create({ data: { ...data, publishedAt } });

      // Categories & related products: replace set.
      await tx.productCategory.deleteMany({ where: { productId: product.id } });
      if (p.categoryIds.length) await tx.productCategory.createMany({ data: p.categoryIds.map((categoryId) => ({ productId: product.id, categoryId })) });
      await tx.relatedProduct.deleteMany({ where: { productId: product.id } });
      const related = p.relatedIds.filter((r) => r !== product.id);
      if (related.length) await tx.relatedProduct.createMany({ data: related.map((relatedId, i) => ({ productId: product.id, relatedId, sortOrder: i })) });

      // Images: replace set in given order.
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      if (p.images.length) await tx.productImage.createMany({ data: p.images.map((img, i) => ({ productId: product.id, url: img.url, altText: img.altText, sortOrder: i })) });

      // Variants: update existing (stock changes go through the inventory ledger), create new,
      // deactivate removed ones (never hard-delete: order history references them).
      const current = await tx.productVariant.findMany({ where: { productId: product.id } });
      const keep = new Set<string>();
      for (const [i, v] of p.variants.entries()) {
        const match = v.id ? current.find((c) => c.id === v.id) : undefined;
        const base = {
          sku: v.sku.toUpperCase(),
          variantName: v.variantName,
          priceMinor: v.priceMinor,
          compareAtPriceMinor: v.compareAtPriceMinor || null,
          lowStockThreshold: v.lowStockThreshold,
          isActive: v.isActive,
          sortOrder: i,
          currency: STORE_CURRENCY,
          attributes: { size: v.variantName },
        };
        if (match) {
          await tx.productVariant.update({ where: { id: match.id }, data: base });
          const delta = v.stockQuantity - match.stockQuantity;
          if (delta !== 0) await adjustStock(tx, { variantId: match.id, delta, reason: "ADJUSTMENT", note: "Edited in product form", actorId: actor.id });
          keep.add(match.id);
        } else {
          const created = await tx.productVariant.create({ data: { ...base, productId: product.id, stockQuantity: 0 } });
          if (v.stockQuantity > 0) await adjustStock(tx, { variantId: created.id, delta: v.stockQuantity, reason: "INITIAL", actorId: actor.id });
          keep.add(created.id);
        }
      }
      const removed = current.filter((c) => !keep.has(c.id)).map((c) => c.id);
      if (removed.length) await tx.productVariant.updateMany({ where: { id: { in: removed } }, data: { isActive: false } });
      return product.id;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = String((err.meta as { target?: string[] })?.target ?? "");
      return { error: target.includes("sku") ? "One of these SKUs is already used by another product." : "That slug is already in use." };
    }
    throw err;
  }

  await audit(actor.id, id ? "product.update" : "product.create", "product", productId, { name: p.name, status: p.status });
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/products/${productId}?created=1`);
  return { success: "Product saved." };
}

export async function setProductStatusAction(formData: FormData) {
  const actor = await assertPermission("products:manage");
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).parse(formData.get("status"));
  if (status === "PUBLISHED") {
    const p = await db.product.findUniqueOrThrow({ where: { id }, include: { images: true, variants: true, categories: true } });
    if (!p.images.length || !p.variants.some((v) => v.isActive) || (!p.description && !p.shortDescription) || !p.categories.length)
      throw new Error("Product is missing required content (description, image, price, category).");
  }
  await db.product.update({ where: { id }, data: { status, ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}) } });
  await audit(actor.id, `product.${status.toLowerCase()}`, "product", id);
  revalidatePath("/", "layout");
}

const categorySchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  thumbnailUrl: z.string().trim().max(500).optional().or(z.literal("")),
  bannerUrl: z.string().trim().max(500).optional().or(z.literal("")),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(170).optional().or(z.literal("")),
  parentId: z.string().uuid().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isVisible: z.boolean(),
});

export async function saveCategoryAction(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const actor = await assertPermission("products:manage");
  const parsed = categorySchema.safeParse({ ...Object.fromEntries(formData), isVisible: formData.get("isVisible") === "on" });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const c = parsed.data;
  if (c.id && c.parentId === c.id) return { error: "A category can't be its own parent." };
  const data = {
    name: c.name,
    slug: slugify(c.slug || c.name),
    description: c.description || null,
    thumbnailUrl: c.thumbnailUrl || null,
    bannerUrl: c.bannerUrl || null,
    seoTitle: c.seoTitle || null,
    seoDescription: c.seoDescription || null,
    parentId: c.parentId || null,
    sortOrder: c.sortOrder,
    isVisible: c.isVisible,
  };
  try {
    const saved = c.id ? await db.category.update({ where: { id: c.id }, data }) : await db.category.create({ data });
    await audit(actor.id, c.id ? "category.update" : "category.create", "category", saved.id, { name: c.name });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { fieldErrors: { slug: "Slug already in use" } };
    throw err;
  }
  revalidatePath("/", "layout");
  return { success: "Category saved." };
}
