import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { findCart } from "@/features/cart/service";
import { getShippingZones, quoteCart } from "@/features/checkout/quote";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { isOnlinePaymentAvailable } from "@/features/payments/provider";
import { EGYPT_GOVERNORATES } from "@/features/shipping/governorates";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await findCart();
  const quote = await quoteCart(cart);
  if (!quote.lines.length) redirect("/cart");
  const [zones, user] = await Promise.all([getShippingZones(), getCurrentUser()]);
  const addresses = user ? await db.customerAddress.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : [];
  const cardEnabled = isOnlinePaymentAvailable();

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl">Checkout</h1>
        <Link href="/cart" className="text-sm underline underline-offset-4">Edit bag</Link>
      </div>
      {!user && (
        <p className="mb-8 rounded-lg bg-white px-4 py-3 text-sm">
          Checking out as a guest. <Link href="/login?next=/checkout" className="underline">Sign in</Link> for faster checkout and order history.
        </p>
      )}
      <CheckoutForm
        lines={quote.lines.filter((l) => l.purchasable)}
        initialTotals={quote.totals}
        issues={quote.issues}
        zones={zones.map((z) => ({ id: z.id, name: z.name, regions: z.regions, feeMinor: z.feeMinor, freeShippingThreshold: z.freeShippingThreshold, estimatedDaysMin: z.estimatedDaysMin, estimatedDaysMax: z.estimatedDaysMax, codAvailable: z.codAvailable }))}
        governorates={[...EGYPT_GOVERNORATES]}
        discountCode={cart?.discountCode ?? ""}
        user={user ? { name: user.name, email: user.email, phone: user.phone ?? "" } : null}
        addresses={addresses.map((a) => ({ id: a.id, recipientName: a.recipientName, phone: a.phone, governorate: a.governorate, city: a.city, street: a.street, building: a.building ?? "", apartment: a.apartment ?? "", instructions: a.instructions ?? "" }))}
        cardEnabled={cardEnabled}
      />
    </div>
  );
}
