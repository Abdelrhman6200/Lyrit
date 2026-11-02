import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge, PageHeader, Table } from "@/components/admin/ui";
import { StockAdjustForm } from "@/components/admin/stock-adjust-form";

export const metadata = { title: "Inventory" };

export default async function InventoryAdmin({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  await requireStaff("inventory:manage");
  const sp = await searchParams;
  const variants = await db.productVariant.findMany({
    where: {
      isActive: true,
      product: { status: { not: "ARCHIVED" } },
      ...(sp.q ? { OR: [{ sku: { contains: sp.q, mode: "insensitive" } }, { product: { name: { contains: sp.q, mode: "insensitive" } } }] } : {}),
    },
    include: { product: { select: { id: true, name: true } } },
    orderBy: [{ stockQuantity: "asc" }],
    take: 200,
  });
  const list = sp.low ? variants.filter((v) => v.stockQuantity <= v.lowStockThreshold) : variants;
  const movements = await db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { variant: { select: { sku: true, product: { select: { name: true } } } } } });
  const actors = await db.user.findMany({ where: { id: { in: movements.map((m) => m.actorId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });

  return (
    <>
      <PageHeader title="Inventory" description="Stock by variant. Every change is recorded with a reason." />
      <form className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <input name="q" defaultValue={sp.q} placeholder="Search product or SKU" className="input !w-auto flex-1 !py-2" aria-label="Search" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="low" value="1" defaultChecked={!!sp.low} className="h-4 w-4 accent-forest" /> Low stock only</label>
        <button className="btn-primary !py-2">Filter</button>
      </form>
      <Table head={["Product", "SKU", "Stock", "Threshold", "Adjust"]} empty="No variants found.">
        {list.map((v) => (
          <tr key={v.id}>
            <td className="px-4 py-3"><Link href={`/admin/products/${v.product.id}`} className="hover:underline">{v.product.name}</Link> <span className="text-muted">· {v.variantName}</span></td>
            <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
            <td className="px-4 py-3"><Badge tone={v.stockQuantity === 0 ? "red" : v.stockQuantity <= v.lowStockThreshold ? "amber" : "green"}>{v.stockQuantity}</Badge></td>
            <td className="px-4 py-3">{v.lowStockThreshold}</td>
            <td className="px-4 py-3"><StockAdjustForm variantId={v.id} /></td>
          </tr>
        ))}
      </Table>
      <h2 className="mb-4 mt-10 text-2xl">Recent stock movements</h2>
      <Table head={["When", "Product", "Change", "Balance", "Reason", "By"]}>
        {movements.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-3">{formatDate(m.createdAt, { dateStyle: "short", timeStyle: "short" })}</td>
            <td className="px-4 py-3">{m.variant.product.name} <span className="font-mono text-xs text-muted">{m.variant.sku}</span></td>
            <td className={`px-4 py-3 font-medium ${m.delta > 0 ? "text-success" : "text-danger"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
            <td className="px-4 py-3">{m.balance}</td>
            <td className="px-4 py-3">{m.reason}{m.note && <span className="block text-xs text-muted">{m.note}</span>}{m.orderId && <Link href={`/admin/orders/${m.orderId}`} className="block text-xs underline">View order</Link>}</td>
            <td className="px-4 py-3">{actors.find((a) => a.id === m.actorId)?.name ?? (m.orderId ? "Checkout" : "System")}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
