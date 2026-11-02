import type { FulfillmentStatus, OrderStatus, PaymentStatus } from "@prisma/client";

/** Allowed fulfilment transitions. Payment and fulfilment are deliberately independent. */
const FULFILLMENT_FLOW: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  UNFULFILLED: ["PROCESSING"],
  PROCESSING: ["SHIPPED", "UNFULFILLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  RETURNED: [],
};

export function canTransitionFulfillment(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
  orderStatus: OrderStatus,
): boolean {
  if (orderStatus !== "CONFIRMED" && orderStatus !== "COMPLETED") return false;
  return FULFILLMENT_FLOW[from].includes(to);
}

export function canCancel(order: { orderStatus: OrderStatus; fulfillmentStatus: FulfillmentStatus }): boolean {
  return (
    (order.orderStatus === "PENDING" || order.orderStatus === "CONFIRMED") &&
    (order.fulfillmentStatus === "UNFULFILLED" || order.fulfillmentStatus === "PROCESSING")
  );
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  CANCELED: "Canceled",
  COMPLETED: "Completed",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PENDING: "Payment pending",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
};

export const FULFILLMENT_STATUS_LABEL: Record<FulfillmentStatus, string> = {
  UNFULFILLED: "Not yet shipped",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
};
