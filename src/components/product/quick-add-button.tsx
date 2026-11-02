"use client";

import { useTransition } from "react";
import { addToCart } from "@/features/cart/actions";
import { useToast } from "@/components/ui/toast";

export function QuickAddButton({ variantId, disabled, productName }: { variantId: string; disabled?: boolean; productName: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn-primary w-full !py-2.5 text-xs"
      disabled={disabled || pending}
      aria-label={disabled ? `${productName} is sold out` : `Add ${productName} to bag`}
      onClick={() =>
        start(async () => {
          const r = await addToCart({ variantId, quantity: 1 });
          toast(r.ok ? r.message ?? "Added to bag" : r.error, r.ok ? "success" : "error");
        })
      }
    >
      {disabled ? "Sold out" : pending ? "Adding…" : "Add to bag"}
    </button>
  );
}
