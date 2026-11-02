import "server-only";
import { Prisma, type FulfillmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import { STORE_CURRENCY } from "@/lib/money";
import { absoluteUrl } from "@/lib/utils";
import type { CheckoutInput } from "@/lib/validation";
import { adjustStock, InsufficientStockError } from "@/features/inventory/service";
import { quoteCart } from "@/features/checkout/quote";
import type { CartWithItems } from "@/features/cart/service";
import { getPaymentProvider } from "@/features/payments/provider";
import { sendOrderNotification } from "@/features/notifications/email";
import { generateOrderNumber } from "./number";
import { canCancel, canTransitionFulfillment } from "./status";

export class CheckoutError extends Error {}

export type PlaceOrderResult =
  | { kind: "confirmed"; publicToken: string }
  | { kind: "redirect"; url: string; publicToken: string };

/**
 * Places an order from the visitor's cart. Everything is recomputed server-side; stock is
 * decremented atomically inside the same transaction as order creation.
 *
 * COD → order CONFIRMED immediately, payment UNPAID (collected on delivery).
 * CARD → order PENDING + payment PENDING; only a verified webhook confirms it.
 */
export async function placeOrder(
  cart: CartWithItems,
  input: CheckoutInput,
  userId: string | null,
): Promise<PlaceOrderResult> {
  const quote = await quoteCart(cart, {
    shippingZoneId: input.shippingZoneId,
    governorate: input.address.governorate,
    customerEmail: input.email,
    discountCode: input.discountCode || null,
  });
  if (quote.lines.length === 0) throw new CheckoutError("Your bag is empty.");
  if (quote.issues.length) throw new CheckoutError(quote.issues[0]);
  if (!quote.shippingZone) throw new CheckoutError("Select a shipping option.");
  if (input.discountCode && quote.discount && !quote.discount.ok) throw new CheckoutError(quote.discount.reason);

  // Resolve the gateway BEFORE reserving stock so a misconfiguration can't strand a pending order.
  let provider: ReturnType<typeof getPaymentProvider> | null = null;
  if (input.paymentMethod !== "COD") {
    try {
      provider = getPaymentProvider();
    } catch {
      throw new CheckoutError("Online payment is currently unavailable. Please choose cash on delivery.");
    }
  }

  const zone = await db.shippingZone.findUniqueOrThrow({ where: { id: quote.shippingZone.id } });
  if (input.paymentMethod === "COD" && !zone.codAvailable)
    throw new CheckoutError("Cash on delivery is not available for this area.");

  const publicToken = randomToken(24);
  const discountRule = quote.discount?.ok
    ? await db.discountCode.findUnique({ where: { code: quote.discount.code } })
    : null;

  let order: { id: string; orderNumber: string; totalMinor: number };
  try {
    order = await db.$transaction(
      async (tx) => {
        let orderNumber = generateOrderNumber();
        for (let i = 0; i < 5 && (await tx.order.findUnique({ where: { orderNumber } })); i++) orderNumber = generateOrderNumber();

        const isCod = input.paymentMethod === "COD";
        const created = await tx.order.create({
          data: {
            orderNumber,
            publicToken,
            customerId: userId,
            customerName: input.name,
            customerEmail: input.email,
            customerPhone: input.phone,
            currency: STORE_CURRENCY,
            ...quote.totals,
            discountCode: quote.discount?.ok ? quote.discount.code : null,
            paymentMethod: input.paymentMethod,
            paymentStatus: isCod ? "UNPAID" : "PENDING",
            orderStatus: isCod ? "CONFIRMED" : "PENDING",
            shippingMethod: zone.name,
            placedAt: isCod ? new Date() : null,
            items: {
              create: quote.lines.map((l) => ({
                variantId: l.variantId,
                productName: l.productName,
                variantName: l.variantName,
                sku: cart.items.find((i) => i.variantId === l.variantId)!.variant.sku,
                imageUrl: l.imageUrl,
                unitPriceMinor: l.unitPriceMinor,
                quantity: l.quantity,
                lineTotalMinor: l.lineTotalMinor,
              })),
            },
            address: {
              create: {
                recipientName: input.address.recipientName,
                phone: input.address.phone,
                governorate: input.address.governorate,
                city: input.address.city,
                street: input.address.street,
                building: input.address.building || null,
                apartment: input.address.apartment || null,
                instructions: input.address.instructions || null,
              },
            },
            events: { create: { type: "created", message: `Order placed (${input.paymentMethod}).` } },
          },
        });

        for (const l of quote.lines) {
          await adjustStock(tx, { variantId: l.variantId, delta: -l.quantity, reason: "ORDER_PLACED", orderId: created.id });
        }

        if (discountRule && quote.totals.discountMinor > 0) {
          // Conditional increment enforces the global usage limit under concurrency.
          const inc = await tx.discountCode.updateMany({
            where: {
              id: discountRule.id,
              isActive: true,
              ...(discountRule.usageLimit !== null ? { usageCount: { lt: discountRule.usageLimit } } : {}),
            },
            data: { usageCount: { increment: 1 } },
          });
          if (inc.count === 0) throw new CheckoutError("This discount code has reached its usage limit.");
          await tx.discountRedemption.create({
            data: { discountCodeId: discountRule.id, orderId: created.id, customerEmail: input.email, amountMinor: quote.totals.discountMinor },
          });
        }

        if (userId && input.saveAddress) {
          const count = await tx.customerAddress.count({ where: { userId } });
          await tx.customerAddress.create({
            data: {
              userId,
              ...input.address,
              building: input.address.building || null,
              apartment: input.address.apartment || null,
              instructions: input.address.instructions || null,
              isDefault: count === 0,
            },
          });
        }

        await tx.cart.delete({ where: { id: cart.id } });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
    );
  } catch (err) {
    if (err instanceof InsufficientStockError) throw new CheckoutError("Sorry — an item in your bag just sold out. Please review your bag.");
    throw err;
  }

  if (input.paymentMethod === "COD") {
    await sendOrderNotification(order.id, "order_confirmation");
    return { kind: "confirmed", publicToken };
  }

  if (!provider) throw new Error("Payment provider not resolved");
  const idempotencyKey = `${order.id}-1`;
  const payment = await db.payment.create({
    data: { orderId: order.id, provider: provider.name, idempotencyKey, method: "CARD", amountMinor: order.totalMinor, currency: STORE_CURRENCY },
  });
  try {
    const result = await provider.initiate({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountMinor: order.totalMinor,
      currency: STORE_CURRENCY,
      idempotencyKey,
      customer: { name: input.name, email: input.email, phone: input.phone },
      returnUrl: absoluteUrl(`/order/confirmation/${publicToken}`),
    });
    await db.payment.update({ where: { id: payment.id }, data: { providerReference: result.providerReference } });
    return { kind: "redirect", url: result.redirectUrl, publicToken };
  } catch (err) {
    console.error("[payments] initiation failed", { orderId: order.id, error: String(err) });
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "Initiation failed" } });
    await releaseOrderStock(order.id, null, "Payment could not be started.");
    throw new CheckoutError("We couldn't start the payment. Please try again or choose cash on delivery.");
  }
}

/**
 * Cancels an order and restores its stock exactly once (guarded by stockRestoredAt).
 */
export async function releaseOrderStock(orderId: string, actorId: string | null, reason: string) {
  let canceled = false;
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, redemptions: true } });
    if (!order || !canCancel(order)) return;
    const claim = await tx.order.updateMany({
      where: { id: orderId, stockRestoredAt: null, orderStatus: { in: ["PENDING", "CONFIRMED"] } },
      data: { orderStatus: "CANCELED", canceledAt: new Date(), stockRestoredAt: new Date() },
    });
    if (claim.count === 0) return;
    for (const item of order.items) {
      if (item.variantId)
        await adjustStock(tx, { variantId: item.variantId, delta: item.quantity, reason: "ORDER_CANCELED", orderId, actorId: actorId ?? undefined });
    }
    for (const r of order.redemptions) {
      await tx.discountCode.updateMany({ where: { id: r.discountCodeId, usageCount: { gt: 0 } }, data: { usageCount: { decrement: 1 } } });
    }
    await tx.discountRedemption.deleteMany({ where: { orderId } });
    await tx.orderEvent.create({ data: { orderId, type: "canceled", message: reason, actorId } });
    canceled = true;
  });
  if (canceled) {
    const o = await db.order.findUnique({ where: { id: orderId }, select: { placedAt: true } });
    // Only notify customers about orders that were actually placed/confirmed.
    if (o?.placedAt) await sendOrderNotification(orderId, "order_canceled");
  }
  return canceled;
}

export async function updateFulfillment(
  orderId: string,
  to: FulfillmentStatus,
  actorId: string,
  shipment?: { carrier?: string; trackingReference?: string; trackingUrl?: string },
) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!canTransitionFulfillment(order.fulfillmentStatus, to, order.orderStatus))
    throw new Error(`Cannot move order from ${order.fulfillmentStatus} to ${to}.`);

  await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, fulfillmentStatus: order.fulfillmentStatus },
      data: {
        fulfillmentStatus: to,
        ...(to === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus === "UNPAID" ? { paymentStatus: "PAID" } : {}),
        ...(to === "DELIVERED" ? { orderStatus: "COMPLETED" } : {}),
      },
    });
    if (res.count === 0) throw new Error("Order was updated by someone else. Refresh and try again.");
    if (to === "SHIPPED") {
      await tx.shipment.create({
        data: {
          orderId,
          carrier: shipment?.carrier || null,
          trackingReference: shipment?.trackingReference || null,
          trackingUrl: shipment?.trackingUrl || null,
          shippedAt: new Date(),
        },
      });
    }
    if (to === "DELIVERED") {
      await tx.shipment.updateMany({ where: { orderId, deliveredAt: null }, data: { deliveredAt: new Date() } });
    }
    await tx.orderEvent.create({ data: { orderId, type: "fulfillment", message: `Fulfilment status changed to ${to}.`, actorId } });
  });

  if (to === "SHIPPED") await sendOrderNotification(orderId, "order_shipped");
  if (to === "DELIVERED") await sendOrderNotification(orderId, "order_delivered");
}
