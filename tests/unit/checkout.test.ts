import { describe, expect, it } from "vitest";
import { computeTotals } from "@/features/checkout/totals";
import { shippingFeeFor, zoneCoversRegion } from "@/features/shipping/rules";

describe("computeTotals", () => {
  it("sums lines, subtracts discount, adds shipping", () => {
    expect(computeTotals({ lines: [{ unitPriceMinor: 42000, quantity: 2 }, { unitPriceMinor: 5000, quantity: 1 }], discountMinor: 8900, shippingMinor: 6000 })).toEqual({
      subtotalMinor: 89000,
      discountMinor: 8900,
      shippingMinor: 6000,
      totalMinor: 86100,
    });
  });
  it("clamps discounts to the subtotal and never goes negative", () => {
    expect(computeTotals({ lines: [{ unitPriceMinor: 1000, quantity: 1 }], discountMinor: 5000, shippingMinor: 0 }).totalMinor).toBe(0);
    expect(computeTotals({ lines: [{ unitPriceMinor: 1000, quantity: 1 }], discountMinor: -50, shippingMinor: 0 }).discountMinor).toBe(0);
  });
  it("rejects non-integer or invalid amounts", () => {
    expect(() => computeTotals({ lines: [{ unitPriceMinor: 10.5, quantity: 1 }], discountMinor: 0, shippingMinor: 0 })).toThrow();
    expect(() => computeTotals({ lines: [{ unitPriceMinor: 100, quantity: 0 }], discountMinor: 0, shippingMinor: 0 })).toThrow();
  });
});

describe("shipping", () => {
  const zone = { id: "z", regions: ["Cairo", "Giza"], feeMinor: 6000, freeShippingThreshold: 100000, isActive: true };
  it("charges the flat fee below the threshold and is free at/above it", () => {
    expect(shippingFeeFor(zone, 99999)).toBe(6000);
    expect(shippingFeeFor(zone, 100000)).toBe(0);
    expect(shippingFeeFor({ ...zone, freeShippingThreshold: null }, 10_000_000)).toBe(6000);
  });
  it("matches governorates case-insensitively; empty regions is a catch-all", () => {
    expect(zoneCoversRegion(zone, "cairo")).toBe(true);
    expect(zoneCoversRegion(zone, "Aswan")).toBe(false);
    expect(zoneCoversRegion({ ...zone, regions: [] }, "Aswan")).toBe(true);
    expect(zoneCoversRegion({ ...zone, isActive: false }, "Cairo")).toBe(false);
  });
});
