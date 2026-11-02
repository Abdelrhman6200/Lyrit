import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { WebhookEvent } from "./provider";
import { releaseOrderStock } from "@/features/orders/service";
import { sendOrderNotification } from "@/features/notifications/email";

export type WebhookOutcome = "processed" | "duplicate" | "ignored";

/**
 * Idempotent webhook processing. Each provider event is stored once (unique provider+eventId);
 * replays return "duplicate" without side effects. Payment rows are updated with conditional
 * writes so the order is marked paid at most once.
 */
export async function processPaymentWebhook(provider: string, event: WebhookEvent): Promise<WebhookOutcome> {
  const inserted = await db.paymentWebhookEvent.createMany({
    data: [{ provider, eventId: event.eventId, eventType: event.type, payload: event.raw as Prisma.InputJsonValue }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) {
    const existing = await db.paymentWebhookEvent.findUnique({ where: { provider_eventId: { provider, eventId: event.eventId } } });
    if (existing?.processedAt) return "duplicate";
    // Previously received but failed mid-processing: fall through and retry (idempotent below).
  }

  const notify: { orderId: string; template: "payment_confirmed" | "order_canceled" }[] = [];
  let outcome: WebhookOutcome = "ignored";

  try {
    await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { providerReference: event.providerReference }, include: { order: true } });
      if (!payment) return;

      if (event.type === "payment.succeeded") {
        if (event.amountMinor !== payment.amountMinor || event.currency !== payment.currency) {
          await tx.orderEvent.create({
            data: { orderId: payment.orderId, type: "payment_mismatch", message: `Gateway reported ${event.amountMinor} ${event.currency}; expected ${payment.amountMinor} ${payment.currency}. Manual review required.` },
          });
          outcome = "processed";
          return;
        }
        const updated = await tx.payment.updateMany({
          where: { id: payment.id, status: { in: ["INITIATED", "FAILED"] } },
          data: { status: "SUCCEEDED", failureReason: null },
        });
        if (updated.count === 0) return; // already succeeded
        if (payment.order.orderStatus === "CANCELED") {
          // Paid after the order expired/was canceled — flag for refund rather than silently re-opening.
          await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "PAID" } });
          await tx.orderEvent.create({ data: { orderId: payment.orderId, type: "payment_after_cancel", message: "Payment received for a canceled order — refund required." } });
        } else {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: "PAID", orderStatus: "CONFIRMED", placedAt: payment.order.placedAt ?? new Date() },
          });
          await tx.orderEvent.create({ data: { orderId: payment.orderId, type: "payment_succeeded", message: `Payment confirmed via ${provider}.` } });
          notify.push({ orderId: payment.orderId, template: "payment_confirmed" });
        }
        outcome = "processed";
      } else if (event.type === "payment.failed") {
        const updated = await tx.payment.updateMany({
          where: { id: payment.id, status: "INITIATED" },
          data: { status: "FAILED", failureReason: event.failureReason?.slice(0, 200) ?? "Declined" },
        });
        if (updated.count && payment.order.paymentStatus !== "PAID") {
          await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "FAILED" } });
          await tx.orderEvent.create({ data: { orderId: payment.orderId, type: "payment_failed", message: "Payment attempt failed." } });
        }
        outcome = "processed";
      } else if (event.type === "payment.refunded") {
        const updated = await tx.payment.updateMany({ where: { id: payment.id, status: "SUCCEEDED" }, data: { status: "REFUNDED" } });
        if (updated.count) {
          const full = event.amountMinor >= payment.amountMinor;
          await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
          await tx.orderEvent.create({ data: { orderId: payment.orderId, type: "payment_refunded", message: `Refund of ${event.amountMinor} recorded.` } });
        }
        outcome = "processed";
      }
    });
    await db.paymentWebhookEvent.update({
      where: { provider_eventId: { provider, eventId: event.eventId } },
      data: { processedAt: new Date(), error: null },
    });
  } catch (err) {
    await db.paymentWebhookEvent
      .update({ where: { provider_eventId: { provider, eventId: event.eventId } }, data: { error: String(err).slice(0, 500) } })
      .catch(() => {});
    throw err;
  }

  for (const n of notify) await sendOrderNotification(n.orderId, n.template);
  return outcome;
}

/** Cancels online-payment orders that were never paid and releases their reserved stock. */
export async function expireStalePendingOrders(olderThanMinutes = 60) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const stale = await db.order.findMany({
    where: { orderStatus: "PENDING", paymentStatus: { in: ["PENDING", "FAILED", "UNPAID"] }, createdAt: { lt: cutoff } },
    select: { id: true },
  });
  for (const o of stale) await releaseOrderStock(o.id, null, "Payment not completed in time.");
  return stale.length;
}
