import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { FULFILLMENT_STATUS_LABEL } from "@/features/orders/status";
import { AddressBook, ChangePasswordForm, ProfileForm, ResendVerification } from "@/components/account/forms";
import { EGYPT_GOVERNORATES } from "@/features/shipping/governorates";

export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser();
  const [orders, addresses] = await Promise.all([
    db.order.findMany({ where: { customerId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.customerAddress.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
  ]);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {!user.emailVerified && (
        <div className="rounded-xl bg-beige px-5 py-4 text-sm lg:col-span-2">
          Please verify your email address — check your inbox for a link. <ResendVerification />
        </div>
      )}
      <section className="card p-6 lg:col-span-2" aria-labelledby="recent">
        <div className="flex items-center justify-between">
          <h2 id="recent" className="text-2xl">Recent orders</h2>
          <Link href="/account/orders" className="text-sm underline">View all</Link>
        </div>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">You haven't placed any orders yet. <Link href="/shop" className="underline">Start shopping</Link>.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line text-sm">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-forest">
                  <span className="font-medium">{o.orderNumber}</span>
                  <span className="text-muted">{formatDate(o.createdAt)}</span>
                  <span>{FULFILLMENT_STATUS_LABEL[o.fulfillmentStatus]}</span>
                  <span>{formatMoney(o.totalMinor, o.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card p-6" aria-labelledby="profile"><h2 id="profile" className="mb-4 text-2xl">Profile</h2><ProfileForm name={user.name} phone={user.phone ?? ""} email={user.email} /></section>
      <section className="card p-6" aria-labelledby="pw"><h2 id="pw" className="mb-4 text-2xl">Password</h2><ChangePasswordForm /></section>
      <section className="card p-6 lg:col-span-2" aria-labelledby="addr">
        <h2 id="addr" className="mb-4 text-2xl">Saved addresses</h2>
        <AddressBook addresses={addresses.map((a) => ({ ...a, building: a.building ?? "", apartment: a.apartment ?? "", instructions: a.instructions ?? "" }))} governorates={[...EGYPT_GOVERNORATES]} />
      </section>
    </div>
  );
}
