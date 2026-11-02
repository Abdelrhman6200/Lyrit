"use client";

import { useMemo, useState, useTransition } from "react";
import { addToCart } from "@/features/cart/actions";
import { useToast } from "@/components/ui/toast";
import { Price } from "@/components/ui/price";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  variantName: string;
  sku: string;
  priceMinor: number;
  compareAtPriceMinor: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
};

export function AddToCartForm({ variants, currency }: { variants: Variant[]; currency: string }) {
  const firstAvailable = variants.find((v) => v.stockQuantity > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [qty, setQty] = useState(1);
  const [pending, start] = useTransition();
  const toast = useToast();
  const variant = useMemo(() => variants.find((v) => v.id === variantId), [variants, variantId]);
  if (!variant) return <p className="text-muted">This product is currently unavailable.</p>;

  const max = Math.min(variant.stockQuantity, 20);
  const soldOut = variant.stockQuantity <= 0;

  return (
    <div className="space-y-6">
      <Price amount={variant.priceMinor} compareAt={variant.compareAtPriceMinor} currency={currency} className="text-2xl" />

      {variants.length > 1 && (
        <fieldset>
          <legend className="label">Size</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className={cn(
                  "cursor-pointer rounded-full border px-5 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-forest",
                  v.id === variantId ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-forest",
                  v.stockQuantity <= 0 && "line-through opacity-60",
                )}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === variantId}
                  onChange={() => {
                    setVariantId(v.id);
                    setQty(1);
                  }}
                  className="sr-only"
                />
                {v.variantName}
                {v.stockQuantity <= 0 && <span className="sr-only"> (sold out)</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <p className={cn("text-sm", soldOut ? "text-danger" : variant.stockQuantity <= variant.lowStockThreshold ? "text-[#8A5A1F]" : "text-success")} role="status">
        {soldOut ? "Out of stock" : variant.stockQuantity <= variant.lowStockThreshold ? `Only ${variant.stockQuantity} left` : "In stock"}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex items-center rounded-full border border-line bg-white" role="group" aria-label="Quantity">
          <button type="button" className="flex h-12 w-12 items-center justify-center disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || soldOut} aria-label="Decrease quantity">
            <MinusIcon width={18} />
          </button>
          <output className="w-8 text-center tabular-nums" aria-live="polite">{qty}</output>
          <button type="button" className="flex h-12 w-12 items-center justify-center disabled:opacity-40" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max || soldOut} aria-label="Increase quantity">
            <PlusIcon width={18} />
          </button>
        </div>
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={soldOut || pending}
          onClick={() =>
            start(async () => {
              const r = await addToCart({ variantId: variant.id, quantity: qty });
              toast(r.ok ? r.message ?? "Added to bag" : r.error, r.ok ? "success" : "error");
            })
          }
        >
          {soldOut ? "Sold out" : pending ? "Adding…" : "Add to bag"}
        </button>
      </div>
      <p className="text-xs text-muted">SKU: {variant.sku}</p>
    </div>
  );
}
