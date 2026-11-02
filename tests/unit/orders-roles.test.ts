import { describe, expect, it } from "vitest";
import { canCancel, canTransitionFulfillment } from "@/features/orders/status";
import { generateOrderNumber } from "@/features/orders/number";
import { hasPermission, isStaff } from "@/lib/auth/roles";
import { csvEscape } from "@/lib/utils";

describe("order status rules", () => {
  it("only allows fulfilment on confirmed orders", () => {
    expect(canTransitionFulfillment("UNFULFILLED", "PROCESSING", "PENDING")).toBe(false);
    expect(canTransitionFulfillment("UNFULFILLED", "PROCESSING", "CONFIRMED")).toBe(true);
    expect(canTransitionFulfillment("UNFULFILLED", "SHIPPED", "CONFIRMED")).toBe(false);
    expect(canTransitionFulfillment("SHIPPED", "DELIVERED", "CONFIRMED")).toBe(true);
    expect(canTransitionFulfillment("UNFULFILLED", "PROCESSING", "CANCELED")).toBe(false);
  });
  it("prevents canceling shipped or already-canceled orders", () => {
    expect(canCancel({ orderStatus: "CONFIRMED", fulfillmentStatus: "PROCESSING" })).toBe(true);
    expect(canCancel({ orderStatus: "CONFIRMED", fulfillmentStatus: "SHIPPED" })).toBe(false);
    expect(canCancel({ orderStatus: "CANCELED", fulfillmentStatus: "UNFULFILLED" })).toBe(false);
  });
  it("generates well-formed order numbers", () => {
    expect(generateOrderNumber(new Date("2026-11-02"))).toMatch(/^LY-26-[2-9A-HJ-NP-Z]{6}$/);
  });
});

describe("roles", () => {
  it("enforces the permission matrix", () => {
    expect(hasPermission(["CUSTOMER"], "dashboard:view")).toBe(false);
    expect(hasPermission(["FULFILLMENT"], "orders:fulfil")).toBe(true);
    expect(hasPermission(["FULFILLMENT"], "customers:pii")).toBe(false);
    expect(hasPermission(["FULFILLMENT"], "products:manage")).toBe(false);
    expect(hasPermission(["STORE_MANAGER"], "products:manage")).toBe(true);
    expect(hasPermission(["STORE_MANAGER"], "staff:manage")).toBe(false);
    expect(hasPermission(["SUPER_ADMIN"], "staff:manage")).toBe(true);
    expect(isStaff(["CUSTOMER"])).toBe(false);
  });
});

describe("csvEscape", () => {
  it("quotes and neutralises formula injection", () => {
    expect(csvEscape('a,"b"')).toBe('"a,""b"""');
    expect(csvEscape("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvEscape(null)).toBe("");
  });
});
