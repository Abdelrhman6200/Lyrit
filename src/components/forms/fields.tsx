"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} aria-busy={pending} className={className} {...rest}>
      {pending ? pendingLabel ?? "Please wait…" : children}
    </button>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  className,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string; hint?: string }) {
  const id = input.id ?? `f-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {input.required && <span aria-hidden className="text-danger"> *</span>}
      </label>
      <input id={id} name={name} className="input" aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

export function TextArea({
  label,
  name,
  error,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; error?: string }) {
  const id = rest.id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <textarea id={id} name={name} className="input min-h-28" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...rest} />
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

export function FormMessage({ state }: { state?: { error?: string; success?: string } }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={cn("rounded-lg px-4 py-3 text-sm", state.error ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>
      {state.error ?? state.success}
    </p>
  );
}
