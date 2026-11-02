import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Badge, fulfilTone, orderTone, PageHeader, Pagination, paymentTone, Table } from "@/components/admin/ui";

export const metadata = { title: "Orders" };

const PAYMENT = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;
const FULFIL = ["UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED", "RETURNED"] as const;
const STATUS = ["PENDING", "CONFIRMED", "CANCELED", "COMPLETED"] as const;

type SP = { q?: string; payment?: string; fulfillment?: string; status?: string; page?: string; from?: string; to?: string };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireStaff("orders:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.q) {
    const q = sp.q.trim().slice(0, 100);
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q } },
    ];
  }
  if (PAYMENT.includes(sp.payment as never)) where.paymentStatus = sp.payment as (typeof PAYMENT)[number];
  if (FULFIL.includes(sp.fulfillment as never)) where.fulfillmentStatus = sp.fulfillment as (typeof FULFIL)[number];
  if (STATUS.includes(sp.status as never)) where.orderStatus = sp.status as (typeof STATUS)[number];
  if (sp.from || sp.to) where.createdAt = { ...(sp.from ? { gte: new Date(`${sp.from}T00:00:00Z`) } : {}), ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59Z`) } : {}) };

  const pageSize = 25;
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    db.order.count({ where }),
  ]);
  const qs = (p: number) => {
    const params = new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/admin/orders?${params}`;
  };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
  const canPii = hasPermission(user.roles, "customers:pii");

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${total} order${total === 1 ? "" : "s"}`}
        actions={hasPermission(user.roles, "orders:export") && <a href={`/admin/orders/export?${exportQs}`} className="btn-secondary !py-2">Export CSV</a>}
      />
      <form method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="lg:col-span-2"><span className="sr-only">Search</span><input name="q" defaultValue={sp.q} placeholder="Order #, name, email, phone" className="input !py-2" /></label>
        <label><span className="sr-only">Order status</span>
          <select name="status" defaultValue={sp.status ?? ""} className="input !py-2"><option value="">Any status</option>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label><span className="sr-only">Payment status</span>
          <select name="payment" defaultValue={sp.payment ?? ""} className="input !py-2"><option value="">Any payment</option>{PAYMENT.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label><span className="sr-only">Fulfilment status</span>
          <select name="fulfillment" defaultValue={sp.fulfillment ?? ""} className="input !py-2"><option value="">Any fulfilment</option>{FULFIL.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <div className="flex gap-2"><button className="btn-primary flex-1 !py-2">Filter</button><Link href="/admin/orders" className="btn-secondary !py-2">Reset</Link></div>
        <label className="text-xs text-muted">From<input type="date" name="from" defaultValue={sp.from} className="input !py-2" /></label>
        <label className="text-xs text-muted">To<input type="date" name="to" defaultValue={sp.to} className="input !py-2" /></label>
      </form>
      <Table head={["Order", "Placed", "Customer", "Status", "Payment", "Fulfilment", "Total"]} empty="No orders match these filters.">
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-ivory/50">
            <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link><span className="block text-xs text-muted">{o.paymentMethod}</span></td>
            <td className="px-4 py-3">{formatDate(o.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
            <td className="px-4 py-3">{o.customerName}{canPii && <span className="block text-xs text-muted">{o.customerEmail}</span>}</td>
            <td className="px-4 py-3"><Badge tone={orderTone(o.orderStatus)}>{o.orderStatus}</Badge></td>
            <td className="px-4 py-3"><Badge tone={paymentTone(o.paymentStatus)}>{o.paymentStatus}</Badge></td>
            <td className="px-4 py-3"><Badge tone={fulfilTone(o.fulfillmentStatus)}>{o.fulfillmentStatus}</Badge></td>
            <td className="px-4 py-3">{formatMoney(o.totalMinor, o.currency)}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pageCount={Math.ceil(total / pageSize)} href={qs} />
    </>
  );
}
