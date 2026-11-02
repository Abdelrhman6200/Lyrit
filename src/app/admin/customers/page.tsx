import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PageHeader, Pagination, Table } from "@/components/admin/ui";

export const metadata = { title: "Customers" };

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireStaff("customers:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    roles: { some: { role: "CUSTOMER" as const } },
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" as const } }, { email: { contains: sp.q, mode: "insensitive" as const } }, { phone: { contains: sp.q } }] } : {}),
  };
  const [customers, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 25, take: 25 }),
    db.user.count({ where }),
  ]);
  const totals = await db.order.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customers.map((c) => c.id) }, paymentStatus: "PAID", orderStatus: { not: "CANCELED" } },
    _sum: { totalMinor: true },
    _count: true,
  });
  const pii = hasPermission(user.roles, "customers:pii");
  return (
    <>
      <PageHeader title="Customers" description={`${total} registered customers. Guest orders are listed under Orders.`} />
      <form className="card mb-6 flex gap-3 p-4"><input name="q" defaultValue={sp.q} placeholder="Search name, email or phone" className="input flex-1 !py-2" aria-label="Search customers" /><button className="btn-primary !py-2">Search</button></form>
      <Table head={["Customer", "Joined", "Paid orders", "Lifetime paid"]} empty="No customers found.">
        {customers.map((c) => {
          const t = totals.find((x) => x.customerId === c.id);
          return (
            <tr key={c.id}>
              <td className="px-4 py-3"><Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link>{pii && <span className="block text-xs text-muted">{c.email}</span>}</td>
              <td className="px-4 py-3">{formatDate(c.createdAt)}</td>
              <td className="px-4 py-3">{t?._count ?? 0}</td>
              <td className="px-4 py-3">{formatMoney(t?._sum.totalMinor ?? 0)}</td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={page} pageCount={Math.ceil(total / 25)} href={(p) => `/admin/customers?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`} />
    </>
  );
}
