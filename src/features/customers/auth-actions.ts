"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";
import { emailSchema, fieldErrors, loginSchema, passwordSchema, registerSchema } from "@/lib/validation";
import { sendAuthEmail } from "@/features/notifications/email";
import { mergeGuestCartIntoUser } from "@/features/cart/service";
import { audit } from "@/lib/audit";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; success?: string } | undefined;

function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

async function issueToken(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET", ttlMs: number) {
  const token = randomToken();
  await db.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
  await db.authToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) } });
  return token;
}

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit(`register:${await clientIp()}`, 5, 3600))) return { error: "Too many attempts. Please try again later." };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, email, password } = parsed.data;

  let userId: string;
  try {
    const user = await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password), roles: { create: { role: "CUSTOMER" } } },
    });
    userId = user.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Don't reveal whether the email is registered beyond what's necessary for UX.
      return { error: "We couldn't create an account with those details. If you already have an account, sign in or reset your password." };
    }
    throw err;
  }
  const token = await issueToken(userId, "EMAIL_VERIFICATION", 24 * 3600_000);
  await sendAuthEmail("verify", email, absoluteUrl(`/verify-email?token=${token}`), `verify:${sha256(token)}`);
  await mergeGuestCartIntoUser(userId);
  await createSession(userId, ["CUSTOMER"]);
  redirect(safeNext(formData.get("next"), "/account?welcome=1"));
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password } = parsed.data;
  if (!(await rateLimit(`login:ip:${ip}`, 20, 900)) || !(await rateLimit(`login:email:${email}`, 8, 900)))
    return { error: "Too many sign-in attempts. Please wait a few minutes and try again." };

  const user = await db.user.findUnique({ where: { email }, include: { roles: true } });
  if (!user || !user.isActive) {
    await burnPasswordCheck(password);
    return { error: "Incorrect email or password." };
  }
  if (!(await verifyPassword(password, user.passwordHash))) return { error: "Incorrect email or password." };

  const roles = user.roles.map((r) => r.role);
  await mergeGuestCartIntoUser(user.id);
  await createSession(user.id, roles);
  if (isStaff(roles)) await audit(user.id, "staff.login", "user", user.id);
  redirect(safeNext(formData.get("next"), isStaff(roles) ? "/admin" : "/account"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: "Enter a valid email address" } };
  const generic = { success: "If an account exists for that email, we've sent a link to reset your password." };
  if (!(await rateLimit(`forgot:${await clientIp()}`, 5, 900)) || !(await rateLimit(`forgot:${parsed.data}`, 3, 3600))) return generic;
  const user = await db.user.findUnique({ where: { email: parsed.data } });
  if (user?.isActive) {
    const token = await issueToken(user.id, "PASSWORD_RESET", 3600_000);
    await sendAuthEmail("reset", user.email, absoluteUrl(`/reset-password?token=${token}`), `reset:${sha256(token)}`);
  }
  return generic;
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const pw = passwordSchema.safeParse(formData.get("password"));
  if (!pw.success) return { fieldErrors: { password: pw.error.issues[0].message } };
  if (formData.get("password") !== formData.get("confirm")) return { fieldErrors: { confirm: "Passwords do not match" } };

  const record = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "PASSWORD_RESET" || record.usedAt || record.expiresAt < new Date())
    return { error: "This reset link is invalid or has expired. Please request a new one." };

  await db.$transaction([
    db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(pw.data), emailVerifiedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }), // sign out everywhere
  ]);
  return { success: "Your password has been updated. You can now sign in." };
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const record = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "EMAIL_VERIFICATION" || record.usedAt || record.expiresAt < new Date()) return false;
  await db.$transaction([
    db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return true;
}

export async function resendVerificationAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.emailVerified) return undefined;
  if (!(await rateLimit(`verify-resend:${user.id}`, 3, 3600))) return { error: "Please wait before requesting another email." };
  const token = await issueToken(user.id, "EMAIL_VERIFICATION", 24 * 3600_000);
  await sendAuthEmail("verify", user.email, absoluteUrl(`/verify-email?token=${token}`), `verify:${sha256(token)}`);
  return { success: "Verification email sent." };
}
