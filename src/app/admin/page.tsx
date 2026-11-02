import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { getBestSellers, getDailySales, getLowStock, getSalesSummary, parseRange } from "@/features/admin/reports";
import { Badge, fulfilTone, PageHeader, paymentTone, StatCard, Table } from "@/components/admin/ui";
import { SalesChart } from "@/components/admin/sales-chart";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireStaff("dashboard:view");
  const { denied } = await searchParams;
  const canReports = hasPermission(user.roles, "reports:view");
  const range = parseRange({}, 30);
  const [summary, daily, best, lowStock, recent, toProcess] = await Promise.all([
    canReports ? getSalesSummary(range) : null,
    canReports ? getDailySales(range) : null,
    canReports ? getBestSellers(range) : null,
    hasPermission(user.roles, "inventory:manage") ? getLowStock(8) : null,
    db.order.findMany({ where: { orderStatus: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.order.count({ where: { orderStatus: "CONFIRMED", fulfillmentStatus: { in: ["UNFULFILLED", "PROCESSING"] } } }),
  ]);

  return (
    <>
      <PageHeader title="Dashboard" description="Last 30 days" actions={<Link href="/admin/orders?fulfillment=UNFULFILLED" className="btn-primary !py-2">{toProcess} orders to fulfil</Link>} />
      {denied && <p role="alert" className="mb-6 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">You don't have permission to view that page.</p>}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Net paid sales" value={formatMoney(summary.netPaidMinor)} hint={`${summary.paidOrders} paid orders`} />
          <StatCard label="Orders" value={summary.confirmedOrders} hint="Confirmed & completed" />
          <StatCard label="Average order" value={formatMoney(summary.averageOrderMinor)} hint="Paid orders" />
          <StatCard label="Awaiting payment" value={formatMoney(summary.pendingMinor)} hint={`${summary.pendingOrders} orders (incl. COD)`} />
          <StatCard label="Refunded" value={formatMoney(summary.refundedMinor)} hint={`${summary.refundedOrders} orders`} />
          <StatCard label="Canceled" value={formatMoney(summary.canceledMinor)} hint={`${summary.canceledOrders} orders`} />
          <StatCard label="To fulfil" value={toProcess} hint="Unfulfilled or processing" />
          <StatCard label="Low stock" value={lowStock?.length ?? "—"} hint="Variants at/below threshold" />
        </div>
      )}
      {daily && (
        <section className="card mt-8 p-6" aria-labelledby="trend">
          <h2 id="trend" className="text-2xl">Sales trend</h2>
          <SalesChart data={daily} />
        </section>
      )}
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        {best && (
          <section aria-labelledby="best">
            <h2 id="best" className="mb-4 text-2xl">Best sellers</h2>
            <Table head={["Product", "Units", "Revenue"]} empty="No sales yet in this period.">
              {best.map((b) => <tr key={b.name}><td className="px-4 py-3">{b.name}</td><td className="px-4 py-3">{b.units}</td><td className="px-4 py-3">{formatMoney(b.revenueMinor)}</td></tr>)}
            </Table>
          </section>
        )}
        {lowStock && (
          <section aria-labelledby="low">
            <h2 id="low" className="mb-4 text-2xl">Low stock</h2>
            <Table head={["Product", "SKU", "Stock"]} empty="All stock levels healthy.">
              {lowStock.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3"><Link href={`/admin/products/${v.product_id}`} className="hover:underline">{v.product_name}</Link> <span className="text-muted">· {v.variant_name}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
                  <td className="px-4 py-3"><Badge tone={v.stock_quantity === 0 ? "red" : "amber"}>{v.stock_quantity}</Badge></td>
                </tr>
              ))}
            </Table>
          </section>
        )}
      </div>
      <section className="mt-8" aria-labelledby="recent">
        <h2 id="recent" className="mb-4 text-2xl">Recent orders</h2>
        <Table head={["Order", "Date", "Customer", "Payment", "Fulfilment", "Total"]}>
          {recent.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link></td>
              <td className="px-4 py-3">{formatDate(o.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
              <td className="px-4 py-3">{o.customerName}</td>
              <td className="px-4 py-3"><Badge tone={paymentTone(o.paymentStatus)}>{o.paymentStatus}</Badge></td>
              <td className="px-4 py-3"><Badge tone={fulfilTone(o.fulfillmentStatus)}>{o.fulfillmentStatus}</Badge></td>
              <td className="px-4 py-3">{formatMoney(o.totalMinor, o.currency)}</td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}
