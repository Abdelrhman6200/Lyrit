"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/features/customers/auth-actions";
import { Field, FormMessage, SubmitButton } from "@/components/forms/fields";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state?.fieldErrors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={state?.fieldErrors?.password} />
      <div className="text-right text-sm"><Link href="/forgot-password" className="underline underline-offset-4">Forgot password?</Link></div>
      <SubmitButton className="btn-primary w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field label="Full name" name="name" autoComplete="name" required error={state?.fieldErrors?.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state?.fieldErrors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required hint="At least 10 characters, including a letter and a number." error={state?.fieldErrors?.password} />
      <SubmitButton className="btn-primary w-full" pendingLabel="Creating account…">Create account</SubmitButton>
      <p className="text-xs text-muted">By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, undefined);
  if (state?.success) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state?.fieldErrors?.email} />
      <SubmitButton className="btn-primary w-full" pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  if (state?.success)
    return (
      <div className="space-y-5">
        <FormMessage state={state} />
        <Link href="/login" className="btn-primary w-full">Sign in</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" required error={state?.fieldErrors?.password} hint="At least 10 characters, including a letter and a number." />
      <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required error={state?.fieldErrors?.confirm} />
      <SubmitButton className="btn-primary w-full" pendingLabel="Saving…">Set new password</SubmitButton>
    </form>
  );
}

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 text-center text-sm text-muted">{subtitle}</p>}
        <div className="card mt-8 p-6 sm:p-8">{children}</div>
        {footer && <p className="mt-6 text-center text-sm">{footer}</p>}
      </div>
    </div>
  );
}
