import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { findCart } from "@/features/cart/service";
import { quoteCart } from "@/features/checkout/quote";
import { formatMoney } from "@/lib/money";
import { CartLineItem } from "@/components/cart/cart-line";
import { DiscountForm } from "@/components/cart/discount-form";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await findCart();
  const quote = await quoteCart(cart);
  const productIds = [...new Set(cart?.items.map((i) => i.variant.productId) ?? [])];
  const siblings = productIds.length
    ? await db.productVariant.findMany({
        where: { productId: { in: productIds }, isActive: true },
        select: { id: true, productId: true, variantName: true, stockQuantity: true },
        orderBy: { sortOrder: "asc" },
      })
    : [];
  const optionsFor = (variantId: string) => {
    const productId = cart?.items.find((i) => i.variantId === variantId)?.variant.productId;
    return siblings.filter((s) => s.productId === productId);
  };

  if (!quote.lines.length) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-4xl">Your bag is empty</h1>
        <p className="mt-3 text-muted">Discover thoughtful hair care made to nourish and restore.</p>
        <Link href="/shop" className="btn-primary mt-8">Continue shopping</Link>
      </div>
    );
  }

  const { totals } = quote;
  return (
    <div className="container-page py-12">
      <h1 className="text-4xl sm:text-5xl">Your bag</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-label="Items">
          {quote.issues.length > 0 && (
            <div role="alert" className="mb-6 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
              {quote.issues.map((i) => <p key={i}>{i}</p>)}
            </div>
          )}
          <ul className="divide-y divide-line border-y border-line">
            {quote.lines.map((l) => (
              <CartLineItem key={l.id} line={l} options={optionsFor(l.variantId)} />
            ))}
          </ul>
          <Link href="/shop" className="mt-6 inline-block text-sm underline underline-offset-4 hover:text-forest">← Continue shopping</Link>
        </section>
        <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-28" aria-label="Order summary">
          <h2 className="text-2xl">Summary</h2>
          <DiscountForm applied={cart?.discountCode ?? null} error={quote.discount && !quote.discount.ok ? quote.discount.reason : null} />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(totals.subtotalMinor)}</dd></div>
            {totals.discountMinor > 0 && <div className="flex justify-between text-forest"><dt>Discount</dt><dd>−{formatMoney(totals.discountMinor)}</dd></div>}
            <div className="flex justify-between text-muted"><dt>Shipping</dt><dd>Calculated at checkout</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Estimated total</dt><dd>{formatMoney(totals.totalMinor)}</dd></div>
          </dl>
          <Link href="/checkout" className={`btn-primary w-full ${quote.issues.length ? "pointer-events-none opacity-50" : ""}`} aria-disabled={quote.issues.length > 0}>
            Proceed to checkout
          </Link>
          <p className="text-center text-xs text-muted">Secure checkout · Cash on delivery available</p>
        </aside>
      </div>
    </div>
  );
}
