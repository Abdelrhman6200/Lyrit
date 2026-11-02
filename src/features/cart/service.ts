import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const CART_COOKIE = "lyrit_cart";
export const MAX_LINE_QUANTITY = 20;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
              categories: { select: { categoryId: true } },
            },
          },
        },
      },
    },
  },
};

async function setCartCookie(id: string) {
  (await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

/** Finds the active cart for this visitor (account cart for signed-in users, cookie cart for guests). */
export async function findCart() {
  const user = await getCurrentUser();
  if (user) {
    return db.cart.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: cartInclude });
  }
  const id = (await cookies()).get(CART_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return db.cart.findFirst({ where: { id, userId: null }, include: cartInclude });
}

export async function getOrCreateCartId(): Promise<string> {
  const existing = await findCart();
  if (existing) return existing.id;
  const user = await getCurrentUser();
  const cart = await db.cart.create({ data: { userId: user?.id ?? null } });
  if (!user) await setCartCookie(cart.id);
  return cart.id;
}

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof findCart>>>;

export type CartLineView = {
  id: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  imageUrl: string | null;
  imageAlt: string;
  unitPriceMinor: number;
  compareAtPriceMinor: number | null;
  quantity: number;
  available: number;
  purchasable: boolean;
  lineTotalMinor: number;
  categoryIds: string[];
};

/** Maps a cart to a view using CURRENT server prices and stock — never stored client values. */
export function toCartLines(cart: CartWithItems | null): CartLineView[] {
  if (!cart) return [];
  return cart.items.map((item) => {
    const v = item.variant;
    const p = v.product;
    const purchasable = v.isActive && p.status === "PUBLISHED" && v.stockQuantity > 0;
    return {
      id: item.id,
      variantId: v.id,
      productName: p.name,
      productSlug: p.slug,
      variantName: v.variantName,
      imageUrl: p.images[0]?.url ?? null,
      imageAlt: p.images[0]?.altText ?? p.name,
      unitPriceMinor: v.priceMinor,
      compareAtPriceMinor: v.compareAtPriceMinor,
      quantity: item.quantity,
      available: v.stockQuantity,
      purchasable,
      lineTotalMinor: v.priceMinor * item.quantity,
      categoryIds: p.categories.map((c) => c.categoryId),
    };
  });
}

/**
 * Merge rule on sign-in: guest cart lines are added to the account cart; quantities for the same
 * variant are summed and capped at available stock and MAX_LINE_QUANTITY. The guest cart is deleted.
 */
export async function mergeGuestCartIntoUser(userId: string) {
  const jar = await cookies();
  const guestId = jar.get(CART_COOKIE)?.value;
  if (!guestId || !/^[0-9a-f-]{36}$/i.test(guestId)) return;
  const guest = await db.cart.findFirst({ where: { id: guestId, userId: null }, include: { items: { include: { variant: true } } } });
  jar.delete(CART_COOKIE);
  if (!guest) return;
  await db.$transaction(async (tx) => {
    let target = await tx.cart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { items: true } });
    target ??= await tx.cart.create({ data: { userId }, include: { items: true } });
    for (const item of guest.items) {
      const existing = target.items.find((i) => i.variantId === item.variantId);
      const cap = Math.min(MAX_LINE_QUANTITY, Math.max(item.variant.stockQuantity, 0));
      const qty = Math.min((existing?.quantity ?? 0) + item.quantity, cap);
      if (qty <= 0) continue;
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: target.id, variantId: item.variantId } },
        create: { cartId: target.id, variantId: item.variantId, quantity: qty },
        update: { quantity: qty },
      });
    }
    if (guest.discountCode && !target.discountCode) {
      await tx.cart.update({ where: { id: target.id }, data: { discountCode: guest.discountCode } });
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
}
