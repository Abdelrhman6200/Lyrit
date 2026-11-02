import { requireStaff } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { getBestSellers, getCategoryPerformance, getDailySales, getDiscountUsage, getSalesSummary, parseRange } from "@/features/admin/reports";
import { PageHeader, StatCard, Table } from "@/components/admin/ui";
import { SalesChart } from "@/components/admin/sales-chart";

export const metadata = { title: "Reports" };

export default async function ReportsAdmin({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireStaff("reports:view");
  const sp = await searchParams;
  const range = parseRange(sp, 30);
  const [summary, daily, best, cats, discounts] = await Promise.all([getSalesSummary(range), getDailySales(range), getBestSellers(range, 10), getCategoryPerformance(range), getDiscountUsage(range)]);
  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        title="Reports"
        description={`${fromStr} → ${toStr} (UTC, by order date)`}
        actions={
          <>
            <a href={`/admin/reports/export?type=daily&from=${fromStr}&to=${toStr}`} className="btn-secondary !py-2">Daily sales CSV</a>
            <a href={`/admin/reports/export?type=products&from=${fromStr}&to=${toStr}`} className="btn-secondary !py-2">Products CSV</a>
          </>
        }
      />
      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs text-muted">From<input type="date" name="from" defaultValue={fromStr} className="input !py-2" /></label>
        <label className="text-xs text-muted">To<input type="date" name="to" defaultValue={toStr} className="input !py-2" /></label>
        <button className="btn-primary !py-2">Apply</button>
      </form>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Net paid sales" value={formatMoney(summary.netPaidMinor)} hint={`${summary.paidOrders} paid orders`} />
        <StatCard label="Average order value" value={formatMoney(summary.averageOrderMinor)} />
        <StatCard label="Pending payment" value={formatMoney(summary.pendingMinor)} hint={`${summary.pendingOrders} orders`} />
        <StatCard label="Discounts given" value={formatMoney(summary.discountsMinor)} hint="On paid orders" />
        <StatCard label="Refunded" value={formatMoney(summary.refundedMinor)} hint={`${summary.refundedOrders} orders`} />
        <StatCard label="Canceled" value={formatMoney(summary.canceledMinor)} hint={`${summary.canceledOrders} orders`} />
        <StatCard label="Shipped" value={summary.byFulfillment.SHIPPED ?? 0} />
        <StatCard label="Delivered" value={summary.byFulfillment.DELIVERED ?? 0} />
      </div>
      <section className="card mt-8 p-6"><h2 className="text-2xl">Daily paid sales</h2><SalesChart data={daily} /></section>
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section><h2 className="mb-4 text-2xl">Best-selling products</h2>
          <Table head={["Product", "Units", "Revenue"]} empty="No sales.">{best.map((b) => <tr key={b.name}><td className="px-4 py-3">{b.name}</td><td className="px-4 py-3">{b.units}</td><td className="px-4 py-3">{formatMoney(b.revenueMinor)}</td></tr>)}</Table>
        </section>
        <section><h2 className="mb-4 text-2xl">Category performance</h2>
          <Table head={["Category", "Units", "Revenue"]} empty="No sales.">{cats.map((c) => <tr key={c.name}><td className="px-4 py-3">{c.name}</td><td className="px-4 py-3">{c.units}</td><td className="px-4 py-3">{formatMoney(c.revenueMinor)}</td></tr>)}</Table>
          <p className="mt-2 text-xs text-muted">Products in several categories count toward each.</p>
        </section>
        <section><h2 className="mb-4 text-2xl">Discount usage</h2>
          <Table head={["Code", "Uses", "Discount given"]} empty="No discounts used.">{discounts.map((d) => <tr key={d.code}><td className="px-4 py-3 font-mono">{d.code}</td><td className="px-4 py-3">{d.uses}</td><td className="px-4 py-3">{formatMoney(d.amountMinor)}</td></tr>)}</Table>
        </section>
      </div>
    </>
  );
}
