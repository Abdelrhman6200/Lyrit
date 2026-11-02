"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms/fields";

type State = { error?: string; success?: string; fieldErrors?: Record<string, string> } | undefined;
type Action = (prev: State, fd: FormData) => Promise<State>;

/** Generic server-action form with status message and field errors rendered by name. */
export function ActionForm({ action, children, submitLabel = "Save", className = "space-y-4" }: { action: Action; children: React.ReactNode; submitLabel?: string; className?: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      <FormMessage state={state} />
      {state?.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
        <ul className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {Object.entries(state.fieldErrors).map(([k, v]) => <li key={k}><strong>{k}</strong>: {v}</li>)}
        </ul>
      )}
      {children}
      <SubmitButton className="btn-primary !py-2" pendingLabel="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}

export function L({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm ${className ?? ""}`}><span className="label">{label}</span>{children}</label>;
}
