import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/auth/roles";
import { AdminNav, type AdminNavItem } from "@/components/admin/nav";
import { logoutAction } from "@/features/customers/auth-actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · LYRIT Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV: (AdminNavItem & { perm: Permission })[] = [
  { href: "/admin", label: "Dashboard", perm: "dashboard:view" },
  { href: "/admin/orders", label: "Orders", perm: "orders:view" },
  { href: "/admin/products", label: "Products", perm: "products:manage" },
  { href: "/admin/categories", label: "Categories", perm: "products:manage" },
  { href: "/admin/inventory", label: "Inventory", perm: "inventory:manage" },
  { href: "/admin/customers", label: "Customers", perm: "customers:view" },
  { href: "/admin/discounts", label: "Discounts", perm: "discounts:manage" },
  { href: "/admin/content", label: "Storefront content", perm: "content:manage" },
  { href: "/admin/shipping", label: "Shipping", perm: "shipping:manage" },
  { href: "/admin/reports", label: "Reports", perm: "reports:view" },
  { href: "/admin/staff", label: "Staff & roles", perm: "staff:manage" },
  { href: "/admin/audit", label: "Audit log", perm: "audit:view" },
];

const ROLE_PRIORITY = ["SUPER_ADMIN", "STORE_MANAGER", "FULFILLMENT"] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const items = NAV.filter((n) => hasPermission(user.roles, n.perm));
  const role = ROLE_PRIORITY.find((r) => user.roles.includes(r)) ?? "STAFF";
  return (
    <div className="min-h-screen bg-ivory lg:flex">
      <AdminNav items={items} user={{ name: user.name, role }} />
      <div className="min-w-0 flex-1">
        <div className="flex justify-end px-4 pt-4 sm:px-8">
          <form action={logoutAction}><button className="text-xs text-muted underline">Sign out</button></form>
        </div>
        <main id="main" className="px-4 pb-16 pt-2 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
