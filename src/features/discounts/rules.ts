import type { DiscountCode } from "@prisma/client";
import { percentOf } from "@/lib/money";

export type DiscountLine = { categoryIds: string[]; lineTotalMinor: number };

export type DiscountEvaluation =
  | { ok: true; amountMinor: number; code: string }
  | { ok: false; reason: string };

type DiscountRule = Pick<
  DiscountCode,
  | "code"
  | "type"
  | "value"
  | "minOrderMinor"
  | "maxDiscountMinor"
  | "usageLimit"
  | "usageCount"
  | "startsAt"
  | "expiresAt"
  | "isActive"
  | "eligibleCategoryIds"
  | "perCustomerLimit"
>;

/**
 * Pure discount evaluation — the single source of truth for discount amounts.
 * `customerRedemptions` is how many times this customer already used the code.
 */
export function evaluateDiscount(
  rule: DiscountRule | null,
  lines: DiscountLine[],
  opts: { now?: Date; customerRedemptions?: number } = {},
): DiscountEvaluation {
  const now = opts.now ?? new Date();
  if (!rule || !rule.isActive) return { ok: false, reason: "This code is not valid." };
  if (rule.startsAt && rule.startsAt > now) return { ok: false, reason: "This code is not active yet." };
  if (rule.expiresAt && rule.expiresAt <= now) return { ok: false, reason: "This code has expired." };
  if (rule.usageLimit !== null && rule.usageCount >= rule.usageLimit)
    return { ok: false, reason: "This code has reached its usage limit." };
  if (rule.perCustomerLimit !== null && (opts.customerRedemptions ?? 0) >= rule.perCustomerLimit)
    return { ok: false, reason: "You have already used this code." };

  const subtotal = lines.reduce((s, l) => s + l.lineTotalMinor, 0);
  if (rule.minOrderMinor !== null && subtotal < rule.minOrderMinor)
    return { ok: false, reason: "Your order does not meet the minimum for this code." };

  const eligibleBase = rule.eligibleCategoryIds.length
    ? lines
        .filter((l) => l.categoryIds.some((c) => rule.eligibleCategoryIds.includes(c)))
        .reduce((s, l) => s + l.lineTotalMinor, 0)
    : subtotal;
  if (eligibleBase <= 0) return { ok: false, reason: "No items in your cart are eligible for this code." };

  let amount = rule.type === "PERCENTAGE" ? percentOf(eligibleBase, Math.min(Math.max(rule.value, 0), 100)) : rule.value;
  if (rule.maxDiscountMinor !== null) amount = Math.min(amount, rule.maxDiscountMinor);
  amount = Math.max(0, Math.min(amount, eligibleBase));
  return { ok: true, amountMinor: amount, code: rule.code };
}
