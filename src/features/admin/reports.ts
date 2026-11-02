import "server-only";
import { db } from "@/lib/db";

export type Range = { from: Date; to: Date };

export function parseRange(sp: { from?: string; to?: string }, defaultDays = 30): Range {
  const to = sp.to && !Number.isNaN(Date.parse(sp.to)) ? new Date(`${sp.to}T23:59:59.999Z`) : new Date();
  const from = sp.from && !Number.isNaN(Date.parse(sp.from)) ? new Date(`${sp.from}T00:00:00.000Z`) : new Date(to.getTime() - defaultDays * 86400_000);
  return { from, to };
}

/**
 * Revenue figures distinguish paid, pending, refunded and canceled amounts (PRD §12.1).
 * "Net paid sales" = paid orders (excluding refunded) in the range by order creation date.
 */
export async function getSalesSummary({ from, to }: Range) {
  const where = { createdAt: { gte: from, lte: to } };
  const [paid, pending, refunded, canceled, ordersByStatus, totalOrders] = await Promise.all([
    db.order.aggregate({ where: { ...where, paymentStatus: "PAID", orderStatus: { not: "CANCELED" } }, _sum: { totalMinor: true, discountMinor: true }, _count: true }),
    db.order.aggregate({ where: { ...where, paymentStatus: { in: ["UNPAID", "PENDING"] }, orderStatus: { in: ["CONFIRMED", "PENDING"] } }, _sum: { totalMinor: true }, _count: true }),
    db.order.aggregate({ where: { ...where, paymentStatus: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } }, _sum: { totalMinor: true }, _count: true }),
    db.order.aggregate({ where: { ...where, orderStatus: "CANCELED" }, _sum: { totalMinor: true }, _count: true }),
    db.order.groupBy({ by: ["fulfillmentStatus"], where: { ...where, orderStatus: { not: "CANCELED" } }, _count: true }),
    db.order.count({ where: { ...where, orderStatus: { in: ["CONFIRMED", "COMPLETED"] } } }),
  ]);
  const paidTotal = paid._sum.totalMinor ?? 0;
  return {
    netPaidMinor: paidTotal,
    paidOrders: paid._count,
    averageOrderMinor: paid._count ? Math.round(paidTotal / paid._count) : 0,
    discountsMinor: paid._sum.discountMinor ?? 0,
    pendingMinor: pending._sum.totalMinor ?? 0,
    pendingOrders: pending._count,
    refundedMinor: refunded._sum.totalMinor ?? 0,
    refundedOrders: refunded._count,
    canceledMinor: canceled._sum.totalMinor ?? 0,
    canceledOrders: canceled._count,
    confirmedOrders: totalOrders,
    byFulfillment: Object.fromEntries(ordersByStatus.map((r) => [r.fulfillmentStatus, r._count])) as Record<string, number>,
  };
}

export async function getDailySales({ from, to }: Range) {
  const rows = await db.$queryRaw<{ day: Date; paid: bigint; orders: bigint }[]>`
    SELECT date_trunc('day', created_at) AS day,
           COALESCE(SUM(total_minor) FILTER (WHERE payment_status = 'PAID' AND order_status <> 'CANCELED'), 0)::bigint AS paid,
           COUNT(*) FILTER (WHERE order_status IN ('CONFIRMED','COMPLETED'))::bigint AS orders
    FROM orders WHERE created_at BETWEEN ${from} AND ${to}
    GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), { paid: Number(r.paid), orders: Number(r.orders) }]));
  const out: { day: string; paid: number; orders: number }[] = [];
  for (let d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())); d <= to; d = new Date(d.getTime() + 86400_000)) {
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, ...(map.get(key) ?? { paid: 0, orders: 0 }) });
  }
  return out;
}

export async function getBestSellers({ from, to }: Range, limit = 5) {
  const rows = await db.$queryRaw<{ product_name: string; units: bigint; revenue: bigint }[]>`
    SELECT oi.product_name, SUM(oi.quantity)::bigint AS units, SUM(oi.line_total_minor)::bigint AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at BETWEEN ${from} AND ${to} AND o.order_status IN ('CONFIRMED','COMPLETED')
    GROUP BY oi.product_name ORDER BY units DESC LIMIT ${limit}`;
  return rows.map((r) => ({ name: r.product_name, units: Number(r.units), revenueMinor: Number(r.revenue) }));
}

export async function getCategoryPerformance({ from, to }: Range) {
  const rows = await db.$queryRaw<{ name: string; units: bigint; revenue: bigint }[]>`
    SELECT c.name, SUM(oi.quantity)::bigint AS units, SUM(oi.line_total_minor)::bigint AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN product_variants v ON v.id = oi.variant_id
    JOIN product_categories pc ON pc.product_id = v.product_id
    JOIN categories c ON c.id = pc.category_id
    WHERE o.created_at BETWEEN ${from} AND ${to} AND o.order_status IN ('CONFIRMED','COMPLETED')
    GROUP BY c.name ORDER BY revenue DESC`;
  return rows.map((r) => ({ name: r.name, units: Number(r.units), revenueMinor: Number(r.revenue) }));
}

export async function getDiscountUsage({ from, to }: Range) {
  const rows = await db.discountRedemption.groupBy({
    by: ["discountCodeId"],
    where: { createdAt: { gte: from, lte: to } },
    _count: true,
    _sum: { amountMinor: true },
  });
  const codes = await db.discountCode.findMany({ where: { id: { in: rows.map((r) => r.discountCodeId) } }, select: { id: true, code: true } });
  return rows.map((r) => ({ code: codes.find((c) => c.id === r.discountCodeId)?.code ?? "—", uses: r._count, amountMinor: r._sum.amountMinor ?? 0 }));
}

export async function getLowStock(limit = 10) {
  return db.$queryRaw<{ id: string; sku: string; variant_name: string; product_name: string; product_id: string; stock_quantity: number; low_stock_threshold: number }[]>`
    SELECT v.id::text, v.sku, v.variant_name, p.name AS product_name, p.id::text AS product_id, v.stock_quantity, v.low_stock_threshold
    FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.is_active AND p.status <> 'ARCHIVED' AND v.stock_quantity <= v.low_stock_threshold
    ORDER BY v.stock_quantity ASC, p.name ASC LIMIT ${limit}`;
}
