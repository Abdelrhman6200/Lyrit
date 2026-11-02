"use client";

import { useState, useTransition } from "react";
import { applyDiscountCode, removeDiscountCode } from "@/features/cart/actions";
import { useToast } from "@/components/ui/toast";

export function DiscountForm({ applied, error }: { applied: string | null; error: string | null }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  if (applied) {
    return (
      <div className="rounded-lg bg-beige/60 px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Code <strong>{applied}</strong></span>
          <button type="button" className="underline" disabled={pending} onClick={() => start(async () => { await removeDiscountCode(); })}>Remove</button>
        </div>
        {error && <p className="mt-1 text-danger">{error}</p>}
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await applyDiscountCode(code);
          if (r.ok) { setMsg(null); setCode(""); toast(r.message ?? "Discount applied"); }
          else setMsg(r.error);
        });
      }}
    >
      <label htmlFor="discount" className="label">Discount code</label>
      <div className="flex gap-2">
        <input id="discount" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="input !py-2.5 uppercase" autoComplete="off" aria-invalid={!!msg} aria-describedby={msg ? "discount-error" : undefined} />
        <button className="btn-secondary !px-4 !py-2.5" disabled={pending || !code.trim()}>{pending ? "…" : "Apply"}</button>
      </div>
      {msg && <p id="discount-error" className="field-error">{msg}</p>}
    </form>
  );
}
