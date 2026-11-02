"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { releaseOrderStock, updateFulfillment } from "@/features/orders/service";

type State = { error?: string; success?: string } | undefined;

const fulfilSchema = z.object({
  orderId: z.string().uuid(),
  to: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "RETURNED", "UNFULFILLED"]),
  carrier: z.string().trim().max(80).optional(),
  trackingReference: z.string().trim().max(120).optional(),
  trackingUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export async function updateFulfillmentAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("orders:fulfil");
  const parsed = fulfilSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the shipment details." };
  const { orderId, to, ...shipment } = parsed.data;
  try {
    await updateFulfillment(orderId, to, actor.id, shipment);
  } catch (err) {
    return { error: (err as Error).message };
  }
  await audit(actor.id, "order.fulfillment", "order", orderId, { to });
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: `Order marked ${to.toLowerCase()}.` };
}

export async function cancelOrderAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("orders:cancel");
  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || "Canceled by store.";
  const ok = await releaseOrderStock(orderId, actor.id, reason);
  if (!ok) return { error: "This order can no longer be canceled (already shipped, delivered or canceled)." };
  await audit(actor.id, "order.cancel", "order", orderId, { reason });
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: "Order canceled and stock restored." };
}

export async function markCodCollectedAction(formData: FormData) {
  const actor = await assertPermission("orders:fulfil");
  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const res = await db.order.updateMany({ where: { id: orderId, paymentMethod: "COD", paymentStatus: "UNPAID", orderStatus: { not: "CANCELED" } }, data: { paymentStatus: "PAID" } });
  if (res.count) {
    await db.orderEvent.create({ data: { orderId, type: "payment_collected", message: "Cash collected on delivery.", actorId: actor.id } });
    await audit(actor.id, "order.cod_collected", "order", orderId);
  }
  revalidatePath(`/admin/orders/${orderId}`);
}

/**
 * Records a refund that was issued in the payment provider dashboard / by cash. Gateway-initiated
 * refunds should arrive via webhook instead. Restricted to roles that can cancel orders.
 */
export async function recordRefundAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("orders:cancel");
  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const restock = formData.get("restock") === "on";
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.paymentStatus !== "PAID") return { error: "Only paid orders can be refunded." };
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
    await tx.orderEvent.create({ data: { orderId, type: "refund_recorded", message: `Refund recorded${restock ? " and items restocked" : ""}.`, actorId: actor.id } });
    if (restock && !order.stockRestoredAt) {
      const { adjustStock } = await import("@/features/inventory/service");
      for (const item of order.items)
        if (item.variantId) await adjustStock(tx, { variantId: item.variantId, delta: item.quantity, reason: "RETURN", orderId, actorId: actor.id });
      await tx.order.update({ where: { id: orderId }, data: { stockRestoredAt: new Date() } });
    }
  });
  await audit(actor.id, "order.refund", "order", orderId, { restock });
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: "Refund recorded." };
}

export async function saveOrderNotesAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("orders:view");
  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const notes = String(formData.get("notes") ?? "").slice(0, 4000);
  await db.order.update({ where: { id: orderId }, data: { internalNotes: notes || null } });
  await audit(actor.id, "order.notes", "order", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: "Notes saved." };
}
