"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { placeOrderAction, previewTotalsAction } from "@/features/checkout/actions";
import type { CartLineView } from "@/features/cart/service";
import type { Totals } from "@/features/checkout/totals";
import { formatMoney } from "@/lib/money";
import { Field, SubmitButton, TextArea } from "@/components/forms/fields";
import { Media } from "@/components/ui/media";
import { cn } from "@/lib/utils";

type Zone = { id: string; name: string; regions: string[]; feeMinor: number; freeShippingThreshold: number | null; estimatedDaysMin: number; estimatedDaysMax: number; codAvailable: boolean };
type Address = { id: string; recipientName: string; phone: string; governorate: string; city: string; street: string; building: string; apartment: string; instructions: string };

export function CheckoutForm(props: {
  lines: CartLineView[];
  initialTotals: Totals;
  issues: string[];
  zones: Zone[];
  governorates: string[];
  discountCode: string;
  user: { name: string; email: string; phone: string } | null;
  addresses: Address[];
  cardEnabled: boolean;
}) {
  const [state, action] = useActionState(placeOrderAction, undefined);
  const fe = state?.fieldErrors ?? {};
  const def = props.addresses[0];
  const [addr, setAddr] = useState<Partial<Address>>(def ?? {});
  const [governorate, setGovernorate] = useState(def?.governorate ?? "");
  const [zoneId, setZoneId] = useState("");
  const [payment, setPayment] = useState<"COD" | "CARD">("COD");
  const [discount, setDiscount] = useState(props.discountCode);
  const [totals, setTotals] = useState(props.initialTotals);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [, startPreview] = useTransition();

  const zones = useMemo(
    () => props.zones.filter((z) => !governorate || z.regions.length === 0 || z.regions.some((r) => r.toLowerCase() === governorate.toLowerCase())),
    [props.zones, governorate],
  );
  // Prefer the most specific zone for the governorate.
  useEffect(() => {
    if (!zones.some((z) => z.id === zoneId)) setZoneId((zones.find((z) => z.regions.length > 0) ?? zones[0])?.id ?? "");
  }, [zones, zoneId]);
  const zone = zones.find((z) => z.id === zoneId);
  useEffect(() => {
    if (zone && !zone.codAvailable && payment === "COD" && props.cardEnabled) setPayment("CARD");
  }, [zone, payment, props.cardEnabled]);

  useEffect(() => {
    const t = setTimeout(() => {
      startPreview(async () => {
        const r = await previewTotalsAction({ shippingZoneId: zoneId, governorate, discountCode: discount });
        setTotals(r.totals);
        setDiscountError(r.discountError);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [zoneId, governorate, discount]);

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[1fr_400px]" noValidate>
      <div className="space-y-10">
        {state?.error && <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>}
        {props.issues.length > 0 && <div role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{props.issues.map((i) => <p key={i}>{i}</p>)}</div>}

        <fieldset className="space-y-4">
          <legend className="mb-4 font-serif text-2xl">1. Contact</legend>
          <Field label="Full name" name="name" autoComplete="name" required defaultValue={props.user?.name} error={fe.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={props.user?.email} error={fe.email} hint="We'll send your order confirmation here." />
            <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" inputMode="tel" required defaultValue={props.user?.phone} placeholder="01XXXXXXXXX" error={fe.phone} />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-4 font-serif text-2xl">2. Delivery address</legend>
          {props.addresses.length > 0 && (
            <div>
              <label htmlFor="saved" className="label">Saved addresses</label>
              <select
                id="saved"
                className="input"
                defaultValue={def?.id}
                onChange={(e) => {
                  const a = props.addresses.find((x) => x.id === e.target.value);
                  setAddr(a ?? {});
                  setGovernorate(a?.governorate ?? "");
                }}
              >
                {props.addresses.map((a) => <option key={a.id} value={a.id}>{a.recipientName} — {a.street}, {a.city}</option>)}
                <option value="">Use a new address</option>
              </select>
            </div>
          )}
          <div key={addr.id ?? "new"} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Recipient name" name="recipientName" autoComplete="shipping name" defaultValue={addr.recipientName} error={fe["address.recipientName"]} hint="Leave blank to use your name." />
              <Field label="Recipient mobile" name="recipientPhone" type="tel" autoComplete="shipping tel" defaultValue={addr.phone} error={fe["address.phone"]} hint="Leave blank to use your number." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="governorate" className="label">Governorate <span aria-hidden className="text-danger">*</span></label>
                <select id="governorate" name="governorate" required className="input" value={governorate} onChange={(e) => setGovernorate(e.target.value)} aria-invalid={!!fe["address.governorate"]}>
                  <option value="">Select…</option>
                  {props.governorates.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {fe["address.governorate"] && <p className="field-error">{fe["address.governorate"]}</p>}
              </div>
              <Field label="City / area" name="city" autoComplete="shipping address-level2" required defaultValue={addr.city} error={fe["address.city"]} />
            </div>
            <Field label="Street address" name="street" autoComplete="shipping address-line1" required defaultValue={addr.street} error={fe["address.street"]} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Building" name="building" defaultValue={addr.building} error={fe["address.building"]} />
              <Field label="Floor / apartment" name="apartment" autoComplete="shipping address-line2" defaultValue={addr.apartment} error={fe["address.apartment"]} />
            </div>
            <TextArea label="Delivery instructions (optional)" name="instructions" defaultValue={addr.instructions} rows={2} error={fe["address.instructions"]} />
          </div>
          {props.user && !addr.id && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="saveAddress" className="h-4 w-4 accent-forest" /> Save this address to my account</label>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-4 font-serif text-2xl">3. Shipping</legend>
          {!governorate ? (
            <p className="text-sm text-muted">Select a governorate to see delivery options.</p>
          ) : zones.length === 0 ? (
            <p className="text-sm text-danger">Sorry, we don't deliver to this area yet.</p>
          ) : (
            <div className="space-y-2">
              {zones.map((z) => (
                <label key={z.id} className={cn("flex cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-4 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-forest", z.id === zoneId ? "border-forest" : "border-line")}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="shippingZoneId" value={z.id} checked={z.id === zoneId} onChange={() => setZoneId(z.id)} className="accent-forest" />
                    <span>
                      <span className="font-medium">{z.name}</span>
                      <span className="block text-muted">{z.estimatedDaysMin}–{z.estimatedDaysMax} working days{z.freeShippingThreshold !== null ? ` · Free over ${formatMoney(z.freeShippingThreshold)}` : ""}</span>
                    </span>
                  </span>
                  <span>{formatMoney(z.feeMinor)}</span>
                </label>
              ))}
            </div>
          )}
          {fe.shippingZoneId && <p className="field-error">{fe.shippingZoneId}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-4 font-serif text-2xl">4. Payment</legend>
          <div className="space-y-2">
            {[
              { v: "COD" as const, title: "Cash on delivery", text: "Pay in cash when your order arrives.", disabled: zone ? !zone.codAvailable : false },
              ...(props.cardEnabled ? [{ v: "CARD" as const, title: "Card or mobile wallet", text: "You'll be redirected to our secure payment partner. We never store your card details.", disabled: false }] : []),
            ].map((o) => (
              <label key={o.v} className={cn("flex cursor-pointer gap-3 rounded-xl border bg-white px-4 py-4 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-forest", payment === o.v ? "border-forest" : "border-line", o.disabled && "cursor-not-allowed opacity-50")}>
                <input type="radio" name="paymentMethod" value={o.v} checked={payment === o.v} disabled={o.disabled} onChange={() => setPayment(o.v)} className="mt-1 accent-forest" />
                <span><span className="font-medium">{o.title}</span><span className="block text-muted">{o.disabled ? "Not available for this area." : o.text}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-28" aria-label="Order summary">
        <h2 className="text-2xl">Order summary</h2>
        <ul className="space-y-4">
          {props.lines.map((l) => (
            <li key={l.id} className="flex gap-3 text-sm">
              <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-beige/50">
                {l.imageUrl && <Media src={l.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-charcoal px-1 text-[11px] text-white">{l.quantity}</span>
              </span>
              <span className="flex-1"><span className="block font-medium">{l.productName}</span><span className="text-muted">{l.variantName}</span></span>
              <span>{formatMoney(l.lineTotalMinor)}</span>
            </li>
          ))}
        </ul>
        <div>
          <label htmlFor="discountCode" className="label">Discount code</label>
          <input id="discountCode" name="discountCode" value={discount} onChange={(e) => setDiscount(e.target.value.toUpperCase())} className="input !py-2.5 uppercase" autoComplete="off" aria-invalid={!!discountError} />
          {discountError && discount && <p className="field-error">{discountError}</p>}
        </div>
        <dl className="space-y-2 text-sm" aria-live="polite">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(totals.subtotalMinor)}</dd></div>
          {totals.discountMinor > 0 && <div className="flex justify-between text-forest"><dt>Discount</dt><dd>−{formatMoney(totals.discountMinor)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{zoneId ? (totals.shippingMinor === 0 ? "Free" : formatMoney(totals.shippingMinor)) : "—"}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total</dt><dd>{formatMoney(totals.totalMinor)}</dd></div>
        </dl>
        <SubmitButton className="btn-primary w-full" pendingLabel="Placing order…" disabled={!zoneId || props.issues.length > 0}>
          {payment === "CARD" ? "Continue to payment" : "Place order"}
        </SubmitButton>
        <p className="text-center text-xs text-muted">By placing your order you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
      </aside>
    </form>
  );
}
