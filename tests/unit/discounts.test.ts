import { describe, expect, it } from "vitest";
import { evaluateDiscount } from "@/features/discounts/rules";

const base = {
  code: "TEST",
  type: "PERCENTAGE" as const,
  value: 10,
  minOrderMinor: null,
  maxDiscountMinor: null,
  usageLimit: null,
  usageCount: 0,
  startsAt: null,
  expiresAt: null,
  isActive: true,
  eligibleCategoryIds: [] as string[],
  perCustomerLimit: null,
};
const lines = [
  { categoryIds: ["a"], lineTotalMinor: 50000 },
  { categoryIds: ["b"], lineTotalMinor: 30000 },
];

describe("evaluateDiscount", () => {
  it("applies percentage discounts to the subtotal", () => {
    expect(evaluateDiscount(base, lines)).toEqual({ ok: true, amountMinor: 8000, code: "TEST" });
  });
  it("applies fixed discounts, never exceeding the eligible amount", () => {
    expect(evaluateDiscount({ ...base, type: "FIXED_AMOUNT", value: 10000 }, lines)).toMatchObject({ amountMinor: 10000 });
    expect(evaluateDiscount({ ...base, type: "FIXED_AMOUNT", value: 999999 }, lines)).toMatchObject({ amountMinor: 80000 });
  });
  it("respects max discount caps", () => {
    expect(evaluateDiscount({ ...base, value: 50, maxDiscountMinor: 5000 }, lines)).toMatchObject({ amountMinor: 5000 });
  });
  it("rejects missing, inactive, expired, not-yet-started codes", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    expect(evaluateDiscount(null, lines).ok).toBe(false);
    expect(evaluateDiscount({ ...base, isActive: false }, lines).ok).toBe(false);
    expect(evaluateDiscount({ ...base, expiresAt: new Date("2026-11-01") }, lines, { now }).ok).toBe(false);
    expect(evaluateDiscount({ ...base, startsAt: new Date("2026-12-01") }, lines, { now }).ok).toBe(false);
  });
  it("enforces usage limits and per-customer limits", () => {
    expect(evaluateDiscount({ ...base, usageLimit: 5, usageCount: 5 }, lines).ok).toBe(false);
    expect(evaluateDiscount({ ...base, perCustomerLimit: 1 }, lines, { customerRedemptions: 1 }).ok).toBe(false);
    expect(evaluateDiscount({ ...base, perCustomerLimit: 1 }, lines, { customerRedemptions: 0 }).ok).toBe(true);
  });
  it("enforces minimum order value", () => {
    expect(evaluateDiscount({ ...base, minOrderMinor: 100000 }, lines).ok).toBe(false);
    expect(evaluateDiscount({ ...base, minOrderMinor: 80000 }, lines).ok).toBe(true);
  });
  it("restricts to eligible categories", () => {
    expect(evaluateDiscount({ ...base, eligibleCategoryIds: ["b"] }, lines)).toMatchObject({ amountMinor: 3000 });
    expect(evaluateDiscount({ ...base, eligibleCategoryIds: ["z"] }, lines).ok).toBe(false);
  });
});
