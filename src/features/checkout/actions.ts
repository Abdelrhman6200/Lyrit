"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkoutSchema, fieldErrors } from "@/lib/validation";
import { findCart } from "@/features/cart/service";
import { CheckoutError, placeOrder } from "@/features/orders/service";
import { quoteCart } from "./quote";

export type CheckoutState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

function formToInput(fd: FormData) {
  const g = (k: string) => (fd.get(k) ?? "").toString();
  return {
    name: g("name"),
    email: g("email"),
    phone: g("phone"),
    address: {
      recipientName: g("recipientName") || g("name"),
      phone: g("recipientPhone") || g("phone"),
      governorate: g("governorate"),
      city: g("city"),
      street: g("street"),
      building: g("building"),
      apartment: g("apartment"),
      instructions: g("instructions"),
    },
    shippingZoneId: g("shippingZoneId"),
    paymentMethod: g("paymentMethod"),
    discountCode: g("discountCode"),
    saveAddress: fd.get("saveAddress") === "on",
  };
}

export async function placeOrderAction(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (!(await rateLimit(`checkout:${await clientIp()}`, 10, 600)))
    return { error: "Too many checkout attempts. Please wait a few minutes." };

  const parsed = checkoutSchema.safeParse(formToInput(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: "Please check the highlighted fields." };

  const cart = await findCart();
  if (!cart || cart.items.length === 0) return { error: "Your bag is empty." };
  const user = await getCurrentUser();

  let destination: string;
  try {
    const result = await placeOrder(cart, parsed.data, user?.id ?? null);
    destination = result.kind === "redirect" ? result.url : `/order/confirmation/${result.publicToken}`;
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message };
    console.error("[checkout] unexpected error", err);
    return { error: "Something went wrong placing your order. You have not been charged — please try again." };
  }
  redirect(destination);
}

/** Lightweight server-side re-quote for live totals on the checkout page. */
export async function previewTotalsAction(input: { shippingZoneId?: string; governorate?: string; discountCode?: string; email?: string }) {
  const cart = await findCart();
  const q = await quoteCart(cart, {
    shippingZoneId: input.shippingZoneId || undefined,
    governorate: input.governorate || undefined,
    discountCode: input.discountCode?.trim().toUpperCase() || null,
    customerEmail: input.email || null,
  });
  return {
    totals: q.totals,
    issues: q.issues,
    discountError: q.discount && !q.discount.ok ? q.discount.reason : null,
  };
}
