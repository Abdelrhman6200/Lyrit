import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/features/customers/auth-actions";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-page py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="mt-2 text-4xl">Hello, {user.name.split(" ")[0]}</h1>
        </div>
        <nav aria-label="Account" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/account" className="btn-ghost">Overview</Link>
          <Link href="/account/orders" className="btn-ghost">Orders</Link>
          {user.roles.some((r) => r !== "CUSTOMER") && <Link href="/admin" className="btn-ghost">Admin</Link>}
          <form action={logoutAction}><button className="btn-secondary !py-2">Sign out</button></form>
        </nav>
      </div>
      {children}
    </div>
  );
}
