"use client";

import { useActionState, useState } from "react";
import type { FulfillmentStatus } from "@prisma/client";
import { cancelOrderAction, recordRefundAction, saveOrderNotesAction, updateFulfillmentAction } from "@/features/admin/order-actions";
import { FormMessage, SubmitButton } from "@/components/forms/fields";

const NEXT: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  UNFULFILLED: ["PROCESSING"],
  PROCESSING: ["SHIPPED", "UNFULFILLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  RETURNED: [],
};

export function FulfillmentForm({ orderId, current }: { orderId: string; current: FulfillmentStatus }) {
  const [state, action] = useActionState(updateFulfillmentAction, undefined);
  const options = NEXT[current];
  const [to, setTo] = useState(options[0]);
  if (!options.length) return <p className="text-sm text-muted">No further fulfilment steps.</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <FormMessage state={state} />
      <label className="block text-sm"><span className="label">Move to</span>
        <select name="to" value={to} onChange={(e) => setTo(e.target.value as FulfillmentStatus)} className="input !py-2">{options.map((o) => <option key={o}>{o}</option>)}</select>
      </label>
      {to === "SHIPPED" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm"><span className="label">Carrier</span><input name="carrier" className="input !py-2" placeholder="e.g. Bosta" /></label>
          <label className="text-sm"><span className="label">Tracking reference</span><input name="trackingReference" className="input !py-2" /></label>
          <label className="text-sm"><span className="label">Tracking URL</span><input name="trackingUrl" type="url" className="input !py-2" /></label>
        </div>
      )}
      <SubmitButton className="btn-primary !py-2" pendingLabel="Updating…">Update fulfilment</SubmitButton>
    </form>
  );
}

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(cancelOrderAction, undefined);
  return (
    <form action={action} className="space-y-3" onSubmit={(e) => { if (!confirm("Cancel this order and restore stock?")) e.preventDefault(); }}>
      <input type="hidden" name="orderId" value={orderId} />
      <FormMessage state={state} />
      <label className="block text-sm"><span className="label">Reason</span><input name="reason" className="input !py-2" placeholder="Customer request" /></label>
      <p className="text-xs text-muted">Stock is restored automatically. Paid online orders must also be refunded in the gateway.</p>
      <SubmitButton className="btn bg-danger text-white hover:bg-danger/90 !py-2" pendingLabel="Canceling…">Cancel order</SubmitButton>
    </form>
  );
}

export function RefundForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(recordRefundAction, undefined);
  return (
    <form action={action} className="space-y-3" onSubmit={(e) => { if (!confirm("Record a full refund for this order?")) e.preventDefault(); }}>
      <input type="hidden" name="orderId" value={orderId} />
      <FormMessage state={state} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" className="h-4 w-4 accent-forest" /> Return items to stock</label>
      <SubmitButton className="btn-secondary !py-2" pendingLabel="Saving…">Record refund</SubmitButton>
    </form>
  );
}

export function NotesForm({ orderId, notes }: { orderId: string; notes: string }) {
  const [state, action] = useActionState(saveOrderNotesAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <FormMessage state={state} />
      <label className="sr-only" htmlFor="notes">Internal notes</label>
      <textarea id="notes" name="notes" defaultValue={notes} rows={4} className="input" placeholder="Visible to staff only" />
      <SubmitButton className="btn-secondary !py-2" pendingLabel="Saving…">Save notes</SubmitButton>
    </form>
  );
}
