import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { createStaffAction, toggleStaffActiveAction, updateStaffRoleAction } from "@/features/admin/misc-actions";
import { Badge, PageHeader, Table } from "@/components/admin/ui";
import { ActionForm, L } from "@/components/admin/forms";

export const metadata = { title: "Staff & roles" };

const ROLES = ["SUPER_ADMIN", "STORE_MANAGER", "FULFILLMENT"] as const;

export default async function StaffAdmin() {
  const me = await requireStaff("staff:manage");
  const staff = await db.user.findMany({ where: { roles: { some: { role: { in: [...ROLES] } } } }, include: { roles: true }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="Staff & roles" description="Permissions are enforced on the server for every page and action." />
      <div className="card mb-8 p-6 text-sm leading-6">
        <p><strong>Super Admin</strong> — everything, including staff, settings and audit log.</p>
        <p><strong>Store Manager</strong> — products, inventory, orders, customers, discounts, content, shipping, reports.</p>
        <p><strong>Fulfilment</strong> — view and fulfil orders; customer contact details are masked.</p>
      </div>
      <Table head={["Name", "Email", "Role", "Status", "Since", ""]}>
        {staff.map((u) => {
          const role = ROLES.find((r) => u.roles.some((x) => x.role === r))!;
          const self = u.id === me.id;
          return (
            <tr key={u.id}>
              <td className="px-4 py-3 font-medium">{u.name}{self && " (you)"}</td>
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">
                {self ? <Badge>{role}</Badge> : (
                  <form action={updateStaffRoleAction} className="flex gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={role} className="rounded-md border border-line bg-white px-2 py-1 text-xs" aria-label={`Role for ${u.name}`}>
                      {ROLES.map((r) => <option key={r}>{r}</option>)}<option value="NONE">Remove staff access</option>
                    </select>
                    <button className="text-xs underline">Update</button>
                  </form>
                )}
              </td>
              <td className="px-4 py-3"><Badge tone={u.isActive ? "green" : "dark"}>{u.isActive ? "Active" : "Disabled"}</Badge></td>
              <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
              <td className="px-4 py-3">{!self && <form action={toggleStaffActiveAction}><input type="hidden" name="userId" value={u.id} /><button className="text-xs underline">{u.isActive ? "Disable" : "Enable"}</button></form>}</td>
            </tr>
          );
        })}
      </Table>
      <section className="card mt-8 p-6">
        <h2 className="mb-4 text-xl">Add staff member</h2>
        <ActionForm action={createStaffAction} submitLabel="Create staff account">
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="Name"><input name="name" required className="input !py-2" /></L>
            <L label="Email"><input name="email" type="email" required className="input !py-2" /></L>
            <L label="Temporary password"><input name="password" type="password" required autoComplete="new-password" className="input !py-2" /></L>
            <L label="Role"><select name="role" className="input !py-2">{ROLES.map((r) => <option key={r}>{r}</option>)}</select></L>
          </div>
          <p className="text-xs text-muted">Share the temporary password securely and ask the staff member to change it from their account page.</p>
        </ActionForm>
      </section>
    </>
  );
}
