"use client";

import { useActionState } from "react";
import { contactAction } from "@/features/content/actions";
import { Field, FormMessage, SubmitButton, TextArea } from "@/components/forms/fields";

export function ContactForm() {
  const [state, action] = useActionState(contactAction, undefined);
  if (state?.success) return <FormMessage state={state} />;
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div aria-hidden className="hidden"><label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
      <Field label="Name" name="name" autoComplete="name" required error={fe.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={fe.email} />
      <Field label="Subject" name="subject" error={fe.subject} />
      <TextArea label="Message" name="message" required rows={6} error={fe.message} />
      <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
    </form>
  );
}
