/**
 * Integration tests for the money/stock-critical paths. They run against the database in
 * DATABASE_URL (use a disposable dev/test database) and clean up after themselves.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adjustStock, InsufficientStockError } from "@/features/inventory/service";
import { processPaymentWebhook } from "@/features/payments/webhooks";
import { releaseOrderStock } from "@/features/orders/service";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const TAG = `itest-${Date.now()}`;
let productId: string;
let variantId: string;

async function makeOrder(opts: { paymentMethod: "COD" | "CARD"; qty: number }) {
  const order = await db.order.create({
    data: {
      orderNumber: `${TAG}-${Math.random().toString(36).slice(2, 8)}`,
      publicToken: `${TAG}-${Math.random().toString(36).slice(2)}-token-xxxxxxxx`,
      customerName: "Test",
      customerEmail: "test@example.com",
      customerPhone: "01000000000",
      subtotalMinor: 10000 * opts.qty,
      totalMinor: 10000 * opts.qty,
      paymentMethod: opts.paymentMethod,
      paymentStatus: opts.paymentMethod === "COD" ? "UNPAID" : "PENDING",
      orderStatus: opts.paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
      items: { create: { variantId, productName: "Test", variantName: "Std", sku: `${TAG}-SKU`, unitPriceMinor: 10000, quantity: opts.qty, lineTotalMinor: 10000 * opts.qty } },
    },
  });
  await db.$transaction((tx) => adjustStock(tx, { variantId, delta: -opts.qty, reason: "ORDER_PLACED", orderId: order.id }));
  return order;
}

run("commerce integrity", () => {
  beforeAll(async () => {
    const p = await db.product.create({
      data: { name: `Test ${TAG}`, slug: TAG, status: "DRAFT", variants: { create: { sku: `${TAG}-SKU`, variantName: "Std", priceMinor: 10000, stockQuantity: 10 } } },
      include: { variants: true },
    });
    productId = p.id;
    variantId = p.variants[0].id;
  });

  afterAll(async () => {
    await db.order.deleteMany({ where: { orderNumber: { startsWith: TAG } } });
    await db.paymentWebhookEvent.deleteMany({ where: { eventId: { startsWith: TAG } } });
    await db.notificationLog.deleteMany({ where: { recipient: "test@example.com" } });
    await db.product.delete({ where: { id: productId } });
    await db.$disconnect();
  });

  it("never oversells under concurrent decrements", async () => {
    await db.productVariant.update({ where: { id: variantId }, data: { stockQuantity: 5 } });
    const attempts = Array.from({ length: 12 }, () =>
      db.$transaction((tx) => adjustStock(tx, { variantId, delta: -1, reason: "ORDER_PLACED" })).then(
        () => "ok",
        (e) => (e instanceof InsufficientStockError ? "sold-out" : Promise.reject(e)),
      ),
    );
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === "ok")).toHaveLength(5);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(v.stockQuantity).toBe(0);
    const ledger = await db.inventoryMovement.aggregate({ where: { variantId, reason: "ORDER_PLACED" }, _sum: { delta: true } });
    expect(ledger._sum.delta).toBe(-5);
  });

  it("processes a payment webhook exactly once and ignores replays", async () => {
    await db.productVariant.update({ where: { id: variantId }, data: { stockQuantity: 10 } });
    const order = await makeOrder({ paymentMethod: "CARD", qty: 1 });
    const ref = `${TAG}-ref-1`;
    await db.payment.create({ data: { orderId: order.id, provider: "mock", providerReference: ref, idempotencyKey: `${TAG}-idem-1`, method: "CARD", amountMinor: order.totalMinor, currency: "EGP" } });
    const event = { eventId: `${TAG}-evt-1`, type: "payment.succeeded", providerReference: ref, amountMinor: order.totalMinor, currency: "EGP", raw: { test: true } };

    expect(await processPaymentWebhook("mock", event)).toBe("processed");
    expect(await processPaymentWebhook("mock", event)).toBe("duplicate");
    // A different event id for the same successful payment must not double-apply either.
    await processPaymentWebhook("mock", { ...event, eventId: `${TAG}-evt-2` });

    const after = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: true } });
    expect(after.paymentStatus).toBe("PAID");
    expect(after.orderStatus).toBe("CONFIRMED");
    expect(after.events.filter((e) => e.type === "payment_succeeded")).toHaveLength(1);
    const notifications = await db.notificationLog.count({ where: { dedupeKey: `order:${order.id}:payment_confirmed` } });
    expect(notifications).toBe(1);
  });

  it("does not mark an order paid on an amount mismatch or failed payment", async () => {
    const order = await makeOrder({ paymentMethod: "CARD", qty: 1 });
    const ref = `${TAG}-ref-2`;
    await db.payment.create({ data: { orderId: order.id, provider: "mock", providerReference: ref, idempotencyKey: `${TAG}-idem-2`, method: "CARD", amountMinor: order.totalMinor, currency: "EGP" } });
    await processPaymentWebhook("mock", { eventId: `${TAG}-evt-3`, type: "payment.succeeded", providerReference: ref, amountMinor: 1, currency: "EGP", raw: {} });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
    await processPaymentWebhook("mock", { eventId: `${TAG}-evt-4`, type: "payment.failed", providerReference: ref, amountMinor: order.totalMinor, currency: "EGP", raw: {} });
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.paymentStatus).toBe("FAILED");
    expect(after.orderStatus).toBe("PENDING");
  });

  it("restores stock exactly once when an order is canceled", async () => {
    await db.productVariant.update({ where: { id: variantId }, data: { stockQuantity: 10 } });
    const order = await makeOrder({ paymentMethod: "COD", qty: 3 });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity).toBe(7);
    const [a, b] = await Promise.all([releaseOrderStock(order.id, null, "test"), releaseOrderStock(order.id, null, "test")]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity).toBe(10);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).orderStatus).toBe("CANCELED");
  });
});
