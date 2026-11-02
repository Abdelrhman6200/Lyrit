import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { FULFILLMENT_STATUS_LABEL, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/features/orders/status";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { CheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(reference)) notFound();
  // The unguessable public token is the capability to view this order (no PII beyond what the buyer entered).
  const order = await db.order.findUnique({
    where: { publicToken: reference },
    include: { items: true, address: true, shipments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();

  const awaitingPayment = order.orderStatus === "PENDING" && order.paymentStatus === "PENDING";
  const failed = order.paymentStatus === "FAILED" && order.orderStatus !== "CONFIRMED";
  const canceled = order.orderStatus === "CANCELED";

  return (
    <div className="container-page max-w-3xl py-14">
      {awaitingPayment && <AutoRefresh seconds={4} />}
      <div className="text-center">
        {!awaitingPayment && !failed && !canceled && (
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest text-white"><CheckIcon /></span>
        )}
        <p className="eyebrow mt-6">Order {order.orderNumber}</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">
          {canceled ? "Order canceled" : failed ? "Payment unsuccessful" : awaitingPayment ? "Confirming your payment…" : `Thank you, ${order.customerName.split(" ")[0]}`}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-charcoal/80" role="status">
          {canceled
            ? "This order has been canceled. If you were charged, a refund will be issued."
            : failed
              ? "Your payment didn't go through and you have not been charged. Your items are reserved for a short time — please try again or contact us."
              : awaitingPayment
                ? "We're waiting for confirmation from the payment provider. This page will update automatically."
                : `We've sent a confirmation to ${order.customerEmail}.`}
        </p>
      </div>

      <div className="card mt-10 divide-y divide-line">
        <div className="grid gap-4 p-6 text-sm sm:grid-cols-3">
          <div><p className="text-muted">Order status</p><p className="mt-1 font-medium">{ORDER_STATUS_LABEL[order.orderStatus]}</p></div>
          <div><p className="text-muted">Payment</p><p className="mt-1 font-medium">{order.paymentMethod === "COD" ? "Cash on delivery" : "Card"} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}</p></div>
          <div><p className="text-muted">Delivery</p><p className="mt-1 font-medium">{FULFILLMENT_STATUS_LABEL[order.fulfillmentStatus]}</p></div>
        </div>
        {order.shipments[0]?.trackingReference && (
          <div className="p-6 text-sm">
            <p className="text-muted">Tracking</p>
            <p className="mt-1">{order.shipments[0].carrier} — {order.shipments[0].trackingUrl ? <a href={order.shipments[0].trackingUrl} className="underline" rel="noopener noreferrer" target="_blank">{order.shipments[0].trackingReference}</a> : order.shipments[0].trackingReference}</p>
          </div>
        )}
        <ul className="space-y-3 p-6 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>{i.productName} <span className="text-muted">· {i.variantName} × {i.quantity}</span></span>
              <span>{formatMoney(i.lineTotalMinor, order.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 p-6 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotalMinor, order.currency)}</dd></div>
          {order.discountMinor > 0 && <div className="flex justify-between text-forest"><dt>Discount {order.discountCode && `(${order.discountCode})`}</dt><dd>−{formatMoney(order.discountMinor, order.currency)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping · {order.shippingMethod}</dt><dd>{order.shippingMinor ? formatMoney(order.shippingMinor, order.currency) : "Free"}</dd></div>
          <div className="flex justify-between pt-2 text-base font-medium"><dt>Total</dt><dd>{formatMoney(order.totalMinor, order.currency)}</dd></div>
        </dl>
        {order.address && (
          <div className="p-6 text-sm">
            <p className="text-muted">Delivering to</p>
            <address className="mt-1 not-italic leading-6">
              {order.address.recipientName}<br />
              {order.address.street}{order.address.building && `, Bldg ${order.address.building}`}{order.address.apartment && `, Apt ${order.address.apartment}`}<br />
              {order.address.city}, {order.address.governorate}
            </address>
          </div>
        )}
        <p className="p-6 text-xs text-muted">Placed {formatDate(order.createdAt, { dateStyle: "long", timeStyle: "short" })}</p>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn-primary">Continue shopping</Link>
        <Link href="/contact" className="btn-secondary">Need help?</Link>
      </div>
    </div>
  );
}
