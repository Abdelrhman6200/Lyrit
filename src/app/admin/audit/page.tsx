import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader, Pagination, Table } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };

export default async function AuditAdmin({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  await requireStaff("audit:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.action ? { action: { startsWith: sp.action } } : {};
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true, email: true } } }, skip: (page - 1) * 50, take: 50 }),
    db.auditLog.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Audit log" description="Sensitive administrative actions." />
      <form className="card mb-6 flex gap-3 p-4"><input name="action" defaultValue={sp.action} placeholder="Filter by action prefix, e.g. order. or staff." className="input flex-1 !py-2" aria-label="Action filter" /><button className="btn-primary !py-2">Filter</button></form>
      <Table head={["When", "Who", "Action", "Entity", "Details", "IP"]}>
        {logs.map((l) => (
          <tr key={l.id}>
            <td className="whitespace-nowrap px-4 py-3">{formatDate(l.createdAt, { dateStyle: "short", timeStyle: "medium" })}</td>
            <td className="px-4 py-3">{l.actor?.name ?? "System"}</td>
            <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
            <td className="px-4 py-3 text-xs">{l.entityType}{l.entityId && <span className="block font-mono text-muted">{l.entityId.slice(0, 40)}</span>}</td>
            <td className="max-w-xs truncate px-4 py-3 font-mono text-xs" title={l.details ? JSON.stringify(l.details) : ""}>{l.details ? JSON.stringify(l.details) : ""}</td>
            <td className="px-4 py-3 text-xs">{l.ip}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pageCount={Math.ceil(total / 50)} href={(p) => `/admin/audit?${new URLSearchParams({ ...(sp.action ? { action: sp.action } : {}), page: String(p) })}`} />
    </>
  );
}
