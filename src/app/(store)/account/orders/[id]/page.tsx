import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

/** Authorised order detail: only the owning customer can resolve it; renders via the confirmation view. */
export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const order = await db.order.findFirst({ where: { id, customerId: user.id }, select: { publicToken: true } });
  if (!order) notFound();
  redirect(`/order/confirmation/${order.publicToken}`);
}
