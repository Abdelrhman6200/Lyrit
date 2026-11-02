import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { hasPermission, isStaff, type Permission } from "./roles";

export const SESSION_COOKIE = "lyrit_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const STAFF_SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  roles: Role[];
  emailVerified: boolean;
};

export async function createSession(userId: string, roles: Role[]) {
  const token = randomToken();
  const ttl = isStaff(roles) ? STAFF_SESSION_TTL_MS : SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);
  const ua = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt, userAgent: ua } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Server-validated current user (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { roles: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    roles: u.roles.map((r) => r.role),
    emailVerified: !!u.emailVerifiedAt,
  };
});

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStaff(permission: Permission = "dashboard:view"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user.roles)) redirect("/");
  if (!hasPermission(user.roles, permission)) redirect("/admin?denied=1");
  return user;
}

/** For server actions: throws instead of redirecting. */
export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.roles, permission)) {
    throw new Error("Not authorised");
  }
  return user;
}
