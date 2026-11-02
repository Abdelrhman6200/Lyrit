import "server-only";
import { db } from "@/lib/db";
import { STORE_CURRENCY } from "@/lib/money";
import { evaluateDiscount, type DiscountEvaluation } from "@/features/discounts/rules";
import { shippingFeeFor, zoneCoversRegion } from "@/features/shipping/rules";
import { computeTotals, type Totals } from "./totals";
import { toCartLines, type CartLineView, type CartWithItems } from "@/features/cart/service";

export async function evaluateCartDiscount(
  cart: CartWithItems,
  code: string,
  customerEmail: string | null,
): Promise<DiscountEvaluation> {
  const rule = await db.discountCode.findUnique({ where: { code: code.toUpperCase() } });
  const lines = toCartLines(cart).filter((l) => l.purchasable);
  const customerRedemptions =
    rule && customerEmail
      ? await db.discountRedemption.count({ where: { discountCodeId: rule.id, customerEmail: customerEmail.toLowerCase() } })
      : 0;
  return evaluateDiscount(rule, lines, { customerRedemptions });
}

export type Quote = {
  lines: CartLineView[];
  issues: string[];
  discount: DiscountEvaluation | null;
  shippingZone: { id: string; name: string; estimatedDaysMin: number; estimatedDaysMax: number } | null;
  totals: Totals;
  currency: string;
};

/**
 * Computes a full server-side quote for the cart. Used by the cart page, checkout page and,
 * authoritatively, when placing the order.
 */
export async function quoteCart(
  cart: CartWithItems | null,
  opts: { shippingZoneId?: string; governorate?: string; customerEmail?: string | null; discountCode?: string | null } = {},
): Promise<Quote> {
  const lines = toCartLines(cart);
  const issues: string[] = [];
  for (const l of lines) {
    if (!l.purchasable) issues.push(`${l.productName} (${l.variantName}) is no longer available.`);
    else if (l.quantity > l.available) issues.push(`Only ${l.available} of ${l.productName} (${l.variantName}) left.`);
  }
  const valid = lines.filter((l) => l.purchasable);
  const base = computeTotals({ lines: valid, discountMinor: 0, shippingMinor: 0 });

  let discount: DiscountEvaluation | null = null;
  const code = opts.discountCode !== undefined ? opts.discountCode : cart?.discountCode;
  if (code && cart) discount = await evaluateCartDiscount(cart, code, opts.customerEmail ?? null);
  const discountMinor = discount?.ok ? discount.amountMinor : 0;

  let shippingMinor = 0;
  let shippingZone: Quote["shippingZone"] = null;
  if (opts.shippingZoneId) {
    const zone = await db.shippingZone.findFirst({ where: { id: opts.shippingZoneId, isActive: true } });
    if (!zone) issues.push("Selected shipping option is unavailable.");
    else if (opts.governorate && !zoneCoversRegion(zone, opts.governorate))
      issues.push("Selected shipping option does not deliver to this governorate.");
    else {
      shippingMinor = shippingFeeFor(zone, base.subtotalMinor - discountMinor);
      shippingZone = { id: zone.id, name: zone.name, estimatedDaysMin: zone.estimatedDaysMin, estimatedDaysMax: zone.estimatedDaysMax };
    }
  }

  return {
    lines,
    issues,
    discount,
    shippingZone,
    totals: computeTotals({ lines: valid, discountMinor, shippingMinor }),
    currency: STORE_CURRENCY,
  };
}

export async function getShippingZones() {
  return db.shippingZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}
