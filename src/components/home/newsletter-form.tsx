"use client";

import Link from "next/link";
import { useActionState } from "react";
import { subscribeNewsletterAction } from "@/features/content/actions";
import { SubmitButton } from "@/components/forms/fields";
import { cn } from "@/lib/utils";

export function NewsletterForm({ tone = "light", source }: { tone?: "light" | "dark"; source: string }) {
  const [state, action] = useActionState(subscribeNewsletterAction, undefined);
  const dark = tone === "dark";
  const id = `newsletter-${source}`;
  if (state?.success) {
    return <p role="status" className={cn("mt-6 text-sm", dark ? "text-ivory" : "text-forest")}>{state.success}</p>;
  }
  return (
    <form action={action} className="mt-6 space-y-3" noValidate>
      <input type="hidden" name="source" value={source} />
      <div aria-hidden className="hidden">
        <label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          aria-invalid={!!state?.fieldErrors?.email}
          className={cn("input flex-1", dark && "border-ivory/30 bg-transparent text-ivory placeholder:text-ivory/60 focus:border-ivory focus:ring-ivory")}
        />
        <SubmitButton className={dark ? "btn bg-ivory text-forest hover:bg-white" : "btn-primary"} pendingLabel="Subscribing…">
          Subscribe
        </SubmitButton>
      </div>
      {state?.fieldErrors?.email && <p className={cn("text-sm", dark ? "text-[#F3C4BA]" : "text-danger")}>{state.fieldErrors.email}</p>}
      <label className={cn("flex items-start gap-2 text-xs leading-5", dark ? "text-ivory/80" : "text-muted")}>
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-current" />
        <span>I agree to receive marketing emails from LYRIT. Unsubscribe at any time. See our <Link href="/privacy" className="underline">Privacy Policy</Link>.</span>
      </label>
      {state?.fieldErrors?.consent && <p className={cn("text-sm", dark ? "text-[#F3C4BA]" : "text-danger")}>{state.fieldErrors.consent}</p>}
      {state?.error && <p role="alert" className="text-sm">{state.error}</p>}
    </form>
  );
}
