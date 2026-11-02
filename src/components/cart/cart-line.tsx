"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { CartLineView } from "@/features/cart/service";
import { changeCartItemVariant, updateCartItem } from "@/features/cart/actions";
import { formatMoney } from "@/lib/money";
import { Media } from "@/components/ui/media";
import { MinusIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Option = { id: string; variantName: string; stockQuantity: number };

export function CartLineItem({ line, options }: { line: CartLineView; options: Option[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast(r.error, "error");
    });
  const max = Math.min(line.available, 20);

  return (
    <li className={cn("flex gap-4 py-6 transition-opacity sm:gap-6", pending && "opacity-60")} aria-busy={pending}>
      <Link href={`/products/${line.productSlug}`} className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-beige/50 sm:h-36 sm:w-28">
        {line.imageUrl && <Media src={line.imageUrl} alt={line.imageAlt} fill sizes="112px" className="object-cover" />}
      </Link>
      <div className="flex flex-1 flex-col">
        <div className="flex justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl leading-tight"><Link href={`/products/${line.productSlug}`} className="hover:text-forest">{line.productName}</Link></h2>
            {options.length > 1 ? (
              <label className="mt-2 block text-sm">
                <span className="sr-only">Size for {line.productName}</span>
                <select
                  value={line.variantId}
                  disabled={pending}
                  onChange={(e) => run(() => changeCartItemVariant({ itemId: line.id, variantId: e.target.value }))}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-sm"
                >
                  {options.map((o) => (
                    <option key={o.id} value={o.id} disabled={o.stockQuantity <= 0 && o.id !== line.variantId}>
                      {o.variantName}{o.stockQuantity <= 0 ? " (sold out)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-1 text-sm text-muted">{line.variantName}</p>
            )}
            <p className="mt-2 text-sm">{formatMoney(line.unitPriceMinor)}</p>
            {!line.purchasable && <p className="mt-1 text-sm text-danger">No longer available</p>}
          </div>
          <p className="font-medium">{formatMoney(line.lineTotalMinor)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-center rounded-full border border-line bg-white" role="group" aria-label={`Quantity for ${line.productName}`}>
            <button type="button" className="flex h-10 w-10 items-center justify-center disabled:opacity-40" disabled={pending || line.quantity <= 1} onClick={() => run(() => updateCartItem({ itemId: line.id, quantity: line.quantity - 1 }))} aria-label="Decrease quantity">
              <MinusIcon width={16} />
            </button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{line.quantity}</span>
            <button type="button" className="flex h-10 w-10 items-center justify-center disabled:opacity-40" disabled={pending || line.quantity >= max} onClick={() => run(() => updateCartItem({ itemId: line.id, quantity: line.quantity + 1 }))} aria-label="Increase quantity">
              <PlusIcon width={16} />
            </button>
          </div>
          <button type="button" className="btn-ghost !px-3 text-sm text-muted" disabled={pending} onClick={() => run(() => updateCartItem({ itemId: line.id, quantity: 0 }))}>
            <TrashIcon width={16} /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}
