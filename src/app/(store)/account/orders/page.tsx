import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { FULFILLMENT_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/features/orders/status";

export const metadata = { title: "Order history", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({ where: { customerId: user.id }, orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } });
  return (
    <section className="card overflow-hidden">
      <h2 className="p-6 text-2xl">Order history</h2>
      {orders.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-y border-line bg-ivory/60 text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-6 py-3">Order</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Payment</th><th className="px-6 py-3">Delivery</th><th className="px-6 py-3 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-4"><Link href={`/account/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.orderNumber}</Link></td>
                  <td className="px-6 py-4">{formatDate(o.createdAt)}</td>
                  <td className="px-6 py-4">{PAYMENT_STATUS_LABEL[o.paymentStatus]}</td>
                  <td className="px-6 py-4">{o.orderStatus === "CANCELED" ? "Canceled" : FULFILLMENT_STATUS_LABEL[o.fulfillmentStatus]}</td>
                  <td className="px-6 py-4 text-right">{formatMoney(o.totalMinor, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
