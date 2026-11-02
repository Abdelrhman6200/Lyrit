"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findCart, getOrCreateCartId, MAX_LINE_QUANTITY } from "./service";

export type CartActionResult = { ok: true; message?: string } | { ok: false; error: string };

const addSchema = z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY) });

export async function addToCart(input: { variantId: string; quantity: number }): Promise<CartActionResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid selection." };
  const { variantId, quantity } = parsed.data;

  const variant = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!variant || !variant.isActive || variant.product.status !== "PUBLISHED")
    return { ok: false, error: "This product is no longer available." };
  if (variant.stockQuantity <= 0) return { ok: false, error: "Sorry, this item is out of stock." };

  const cartId = await getOrCreateCartId();
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const desired = (existing?.quantity ?? 0) + quantity;
  const cap = Math.min(MAX_LINE_QUANTITY, variant.stockQuantity);
  const finalQty = Math.min(desired, cap);
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, quantity: finalQty },
    update: { quantity: finalQty },
  });
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  revalidatePath("/", "layout");
  return finalQty < desired
    ? { ok: true, message: `Only ${cap} available — quantity adjusted.` }
    : { ok: true, message: `${variant.product.name} added to your bag.` };
}

const updateSchema = z.object({ itemId: z.string().uuid(), quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY) });

export async function updateCartItem(input: { itemId: string; quantity: number }): Promise<CartActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid quantity." };
  const cart = await findCart();
  const item = cart?.items.find((i) => i.id === parsed.data.itemId);
  if (!cart || !item) return { ok: false, error: "Item not found in your bag." };

  if (parsed.data.quantity === 0) {
    await db.cartItem.delete({ where: { id: item.id } });
  } else {
    const qty = Math.min(parsed.data.quantity, item.variant.stockQuantity, MAX_LINE_QUANTITY);
    if (qty <= 0) await db.cartItem.delete({ where: { id: item.id } });
    else await db.cartItem.update({ where: { id: item.id }, data: { quantity: qty } });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const variantSwapSchema = z.object({ itemId: z.string().uuid(), variantId: z.string().uuid() });

export async function changeCartItemVariant(input: { itemId: string; variantId: string }): Promise<CartActionResult> {
  const parsed = variantSwapSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid selection." };
  const cart = await findCart();
  const item = cart?.items.find((i) => i.id === parsed.data.itemId);
  if (!cart || !item) return { ok: false, error: "Item not found in your bag." };
  const next = await db.productVariant.findFirst({
    where: { id: parsed.data.variantId, productId: item.variant.productId, isActive: true },
  });
  if (!next || next.stockQuantity <= 0) return { ok: false, error: "That option is unavailable." };
  await db.$transaction(async (tx) => {
    await tx.cartItem.delete({ where: { id: item.id } });
    const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: next.id } } });
    const qty = Math.min((existing?.quantity ?? 0) + item.quantity, next.stockQuantity, MAX_LINE_QUANTITY);
    await tx.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: next.id } },
      create: { cartId: cart.id, variantId: next.id, quantity: qty },
      update: { quantity: qty },
    });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function applyDiscountCode(code: string): Promise<CartActionResult> {
  const normalized = z.string().trim().toUpperCase().max(40).safeParse(code);
  if (!normalized.success || !normalized.data) return { ok: false, error: "Enter a discount code." };
  const cart = await findCart();
  if (!cart || cart.items.length === 0) return { ok: false, error: "Your bag is empty." };
  const { evaluateCartDiscount } = await import("@/features/checkout/quote");
  const result = await evaluateCartDiscount(cart, normalized.data, null);
  if (!result.ok) return { ok: false, error: result.reason };
  await db.cart.update({ where: { id: cart.id }, data: { discountCode: normalized.data } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Discount applied." };
}

export async function removeDiscountCode(): Promise<CartActionResult> {
  const cart = await findCart();
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { discountCode: null } });
  revalidatePath("/", "layout");
  return { ok: true };
}
