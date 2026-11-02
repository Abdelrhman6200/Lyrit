import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { canCancel } from "@/features/orders/status";
import { markCodCollectedAction } from "@/features/admin/order-actions";
import { Badge, fulfilTone, orderTone, PageHeader, paymentTone } from "@/components/admin/ui";
import { CancelOrderForm, FulfillmentForm, NotesForm, RefundForm } from "@/components/admin/order-forms";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("orders:view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, address: true, payments: { orderBy: { createdAt: "desc" } }, shipments: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();
  const canPii = hasPermission(user.roles, "customers:pii");
  const mask = (s: string) => (canPii ? s : s.replace(/.(?=.{3})/g, "•"));

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/orders" className="underline">← Orders</Link></p>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDate(order.createdAt, { dateStyle: "long", timeStyle: "short" })} · ${order.paymentMethod}`}
        actions={<div className="flex gap-2"><Badge tone={orderTone(order.orderStatus)}>{order.orderStatus}</Badge><Badge tone={paymentTone(order.paymentStatus)}>{order.paymentStatus}</Badge><Badge tone={fulfilTone(order.fulfillmentStatus)}>{order.fulfillmentStatus}</Badge></div>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 text-xl">Items</h2>
            <ul className="divide-y divide-line text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3">
                  <span>{i.productName} <span className="text-muted">· {i.variantName} · <span className="font-mono text-xs">{i.sku}</span></span><br /><span className="text-muted">{formatMoney(i.unitPriceMinor, order.currency)} × {i.quantity}</span></span>
                  <span>{formatMoney(i.lineTotalMinor, order.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotalMinor, order.currency)}</dd></div>
              <div className="flex justify-between"><dt>Discount {order.discountCode && `(${order.discountCode})`}</dt><dd>−{formatMoney(order.discountMinor, order.currency)}</dd></div>
              <div className="flex justify-between"><dt>Shipping ({order.shippingMethod})</dt><dd>{formatMoney(order.shippingMinor, order.currency)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Total</dt><dd>{formatMoney(order.totalMinor, order.currency)}</dd></div>
            </dl>
          </section>

          {hasPermission(user.roles, "orders:fulfil") && order.orderStatus !== "CANCELED" && order.orderStatus !== "PENDING" && (
            <section className="card p-6">
              <h2 className="mb-4 text-xl">Fulfilment</h2>
              <FulfillmentForm orderId={order.id} current={order.fulfillmentStatus} />
              {order.paymentMethod === "COD" && order.paymentStatus === "UNPAID" && (
                <form action={markCodCollectedAction} className="mt-4 border-t border-line pt-4">
                  <input type="hidden" name="orderId" value={order.id} />
                  <button className="btn-secondary !py-2">Mark cash collected</button>
                </form>
              )}
            </section>
          )}
          {order.orderStatus === "PENDING" && <p className="rounded-lg bg-beige px-4 py-3 text-sm">Awaiting online payment confirmation from the gateway. This order can't be fulfilled until payment is confirmed.</p>}

          {order.shipments.length > 0 && (
            <section className="card p-6">
              <h2 className="mb-4 text-xl">Shipments</h2>
              <ul className="space-y-2 text-sm">
                {order.shipments.map((s) => (
                  <li key={s.id}>{s.carrier ?? "Carrier n/a"} · {s.trackingReference ?? "no tracking ref"} · shipped {s.shippedAt ? formatDate(s.shippedAt) : "—"}{s.deliveredAt && ` · delivered ${formatDate(s.deliveredAt)}`}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-6">
            <h2 className="mb-4 text-xl">Timeline</h2>
            <ol className="space-y-3 text-sm">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3"><span className="w-40 shrink-0 text-muted">{formatDate(e.createdAt, { dateStyle: "short", timeStyle: "short" })}</span><span>{e.message}</span></li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6 text-sm">
            <h2 className="mb-3 text-xl">Customer</h2>
            <p className="font-medium">{order.customerName}</p>
            <p>{mask(order.customerEmail)}</p>
            <p>{mask(order.customerPhone)}</p>
            {order.customerId && hasPermission(user.roles, "customers:view") && <Link href={`/admin/customers/${order.customerId}`} className="mt-2 inline-block underline">View customer</Link>}
            {!order.customerId && <p className="mt-2 text-muted">Guest checkout</p>}
          </section>
          {order.address && (
            <section className="card p-6 text-sm">
              <h2 className="mb-3 text-xl">Delivery</h2>
              <address className="not-italic leading-6">
                {order.address.recipientName}<br />{mask(order.address.phone)}<br />
                {order.address.street}{order.address.building && `, Bldg ${order.address.building}`}{order.address.apartment && `, Apt ${order.address.apartment}`}<br />
                {order.address.city}, {order.address.governorate}
              </address>
              {order.address.instructions && <p className="mt-2 rounded bg-ivory p-2">{order.address.instructions}</p>}
            </section>
          )}
          <section className="card p-6 text-sm">
            <h2 className="mb-3 text-xl">Payments</h2>
            {order.payments.length === 0 ? <p className="text-muted">{order.paymentMethod === "COD" ? "Cash on delivery" : "No payment attempts"}</p> : (
              <ul className="space-y-2">
                {order.payments.map((p) => <li key={p.id}>{p.provider} · {formatMoney(p.amountMinor, p.currency)} · <Badge tone={p.status === "SUCCEEDED" ? "green" : p.status === "FAILED" ? "red" : "amber"}>{p.status}</Badge>{p.failureReason && <span className="block text-muted">{p.failureReason}</span>}</li>)}
              </ul>
            )}
            {hasPermission(user.roles, "orders:cancel") && order.paymentStatus === "PAID" && <div className="mt-4 border-t border-line pt-4"><RefundForm orderId={order.id} /></div>}
          </section>
          <section className="card p-6"><h2 className="mb-3 text-xl">Internal notes</h2><NotesForm orderId={order.id} notes={order.internalNotes ?? ""} /></section>
          {hasPermission(user.roles, "orders:cancel") && canCancel(order) && (
            <section className="card border border-danger/30 p-6"><h2 className="mb-3 text-xl">Cancel order</h2><CancelOrderForm orderId={order.id} /></section>
          )}
        </aside>
      </div>
    </>
  );
}
