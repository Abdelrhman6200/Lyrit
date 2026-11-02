"use client";

import { useActionState } from "react";
import { adjustInventoryAction } from "@/features/admin/inventory-actions";

export function StockAdjustForm({ variantId }: { variantId: string }) {
  const [state, action, pending] = useActionState(adjustInventoryAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="variantId" value={variantId} />
      <select name="mode" className="rounded-md border border-line bg-white px-2 py-1.5 text-xs" aria-label="Adjustment type"><option value="delta">Add/remove</option><option value="set">Set to</option></select>
      <input name="amount" type="number" required className="w-20 rounded-md border border-line bg-white px-2 py-1.5 text-xs" aria-label="Quantity" placeholder="±qty" />
      <select name="reason" className="rounded-md border border-line bg-white px-2 py-1.5 text-xs" aria-label="Reason"><option value="RESTOCK">Restock</option><option value="ADJUSTMENT">Count correction</option><option value="DAMAGED">Damaged</option><option value="RETURN">Return</option></select>
      <input name="note" className="w-28 rounded-md border border-line bg-white px-2 py-1.5 text-xs" placeholder="Note" aria-label="Note" />
      <button className="rounded-md bg-forest px-3 py-1.5 text-xs text-white disabled:opacity-50" disabled={pending}>{pending ? "…" : "Apply"}</button>
      {state?.error && <span className="w-full text-xs text-danger" role="alert">{state.error}</span>}
      {state?.success && <span className="w-full text-xs text-success" role="status">{state.success}</span>}
    </form>
  );
}
