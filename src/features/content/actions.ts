"use server";

import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { contactSchema, fieldErrors, newsletterSchema } from "@/lib/validation";
import type { FormState } from "@/features/customers/auth-actions";

export async function subscribeNewsletterAction(_: FormState, formData: FormData): Promise<FormState> {
  // Honeypot field — bots tend to fill every input.
  if (formData.get("company")) return { success: "Thank you for subscribing." };
  if (!(await rateLimit(`newsletter:${await clientIp()}`, 5, 3600))) return { error: "Too many requests. Please try again later." };
  const parsed = newsletterSchema.safeParse({ email: formData.get("email"), consent: formData.get("consent") === "on" });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const existing = await db.newsletterSubscriber.findUnique({ where: { email: parsed.data.email } });
  if (existing && !existing.unsubscribedAt) return { success: "You're already on the list — thank you!" };
  await db.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    create: { email: parsed.data.email, consentAt: new Date(), source: String(formData.get("source") ?? "site").slice(0, 40) },
    update: { consentAt: new Date(), unsubscribedAt: null },
  });
  return { success: "Thank you for subscribing." };
}

export async function contactAction(_: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("company")) return { success: "Thanks — we'll be in touch soon." };
  if (!(await rateLimit(`contact:${await clientIp()}`, 5, 3600))) return { error: "Too many messages. Please try again later." };
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await db.contactMessage.create({ data: { ...parsed.data, subject: parsed.data.subject || null } });
  return { success: "Thanks — we'll be in touch soon." };
}
