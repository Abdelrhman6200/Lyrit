import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { addCustomerNoteAction } from "@/features/admin/misc-actions";
import { Badge, fulfilTone, PageHeader, paymentTone, StatCard, Table } from "@/components/admin/ui";

export const metadata = { title: "Customer" };

export default async function CustomerAdmin({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("customers:view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const pii = hasPermission(user.roles, "customers:pii");
  const customer = await db.user.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" } }, addresses: pii, notes: pii ? { orderBy: { createdAt: "desc" } } : false },
  });
  if (!customer) notFound();
  const paid = customer.orders.filter((o) => o.paymentStatus === "PAID" && o.orderStatus !== "CANCELED");
  const lifetime = paid.reduce((s, o) => s + o.totalMinor, 0);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/customers" className="underline">← Customers</Link></p>
      <PageHeader title={customer.name} description={pii ? `${customer.email}${customer.phone ? ` · ${customer.phone}` : ""}` : "Contact details restricted for your role"} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Lifetime paid" value={formatMoney(lifetime)} />
        <StatCard label="Paid orders" value={paid.length} />
        <StatCard label="All orders" value={customer.orders.length} />
        <StatCard label="Customer since" value={formatDate(customer.createdAt)} />
      </div>
      <h2 className="mb-4 mt-8 text-2xl">Orders</h2>
      <Table head={["Order", "Date", "Payment", "Fulfilment", "Total"]} empty="No orders.">
        {customer.orders.map((o) => (
          <tr key={o.id}>
            <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link></td>
            <td className="px-4 py-3">{formatDate(o.createdAt)}</td>
            <td className="px-4 py-3"><Badge tone={paymentTone(o.paymentStatus)}>{o.paymentStatus}</Badge></td>
            <td className="px-4 py-3"><Badge tone={fulfilTone(o.fulfillmentStatus)}>{o.fulfillmentStatus}</Badge></td>
            <td className="px-4 py-3">{formatMoney(o.totalMinor, o.currency)}</td>
          </tr>
        ))}
      </Table>
      {pii && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <h2 className="mb-4 text-xl">Addresses</h2>
            {customer.addresses.length === 0 ? <p className="text-sm text-muted">None saved.</p> : (
              <ul className="space-y-3 text-sm">{customer.addresses.map((a) => <li key={a.id}>{a.recipientName} · {a.phone}<br />{a.street}, {a.city}, {a.governorate}</li>)}</ul>
            )}
          </section>
          <section className="card p-6">
            <h2 className="mb-4 text-xl">Support notes</h2>
            <form action={addCustomerNoteAction} className="mb-4 flex gap-2">
              <input type="hidden" name="customerId" value={customer.id} />
              <input name="body" required maxLength={2000} className="input flex-1 !py-2" placeholder="Add a note (staff only)" aria-label="Note" />
              <button className="btn-primary !py-2">Add</button>
            </form>
            <ul className="space-y-2 text-sm">{customer.notes.map((n) => <li key={n.id} className="rounded bg-ivory p-2"><span className="text-xs text-muted">{formatDate(n.createdAt, { dateStyle: "short", timeStyle: "short" })}</span><br />{n.body}</li>)}</ul>
          </section>
        </div>
      )}
    </>
  );
}
