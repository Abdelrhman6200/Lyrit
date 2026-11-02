import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { minorToMajorString } from "@/lib/money";
import { csvEscape } from "@/lib/utils";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.roles, "orders:export")) return new Response("Forbidden", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const where: Prisma.OrderWhereInput = {};
  const from = sp.get("from");
  const to = sp.get("to");
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}) };
  for (const [param, field] of [["payment", "paymentStatus"], ["fulfillment", "fulfillmentStatus"], ["status", "orderStatus"]] as const) {
    const v = sp.get(param);
    if (v && /^[A-Z_]+$/.test(v)) (where as Record<string, unknown>)[field] = v;
  }
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "asc" }, include: { address: true, _count: { select: { items: true } } }, take: 20_000 });
  const header = ["order_number", "created_at", "customer_name", "customer_email", "customer_phone", "governorate", "city", "items", "subtotal", "discount", "shipping", "total", "currency", "payment_method", "payment_status", "fulfillment_status", "order_status", "discount_code"];
  const rows = orders.map((o) =>
    [o.orderNumber, o.createdAt.toISOString(), o.customerName, o.customerEmail, o.customerPhone, o.address?.governorate, o.address?.city, o._count.items, minorToMajorString(o.subtotalMinor), minorToMajorString(o.discountMinor), minorToMajorString(o.shippingMinor), minorToMajorString(o.totalMinor), o.currency, o.paymentMethod, o.paymentStatus, o.fulfillmentStatus, o.orderStatus, o.discountCode]
      .map(csvEscape)
      .join(","),
  );
  await audit(user.id, "orders.export", "order", null, { count: orders.length, from, to });
  return new Response("﻿" + [header.join(","), ...rows].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lyrit-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
