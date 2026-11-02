"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { parseMajorToMinor } from "@/lib/money";
import { emailSchema, fieldErrors, passwordSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import {
  announcementSchema,
  benefitsSchema,
  footerSchema,
  heroSchema,
  navigationSchema,
  promoSchema,
} from "@/features/content/types";

type State = { error?: string; success?: string; fieldErrors?: Record<string, string> } | undefined;

const money = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : parseMajorToMinor(s);
};

// ───────── Discounts ─────────

export async function saveDiscountAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("discounts:manage");
  const type = formData.get("type") === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
  const rawValue = String(formData.get("value") ?? "");
  const value = type === "PERCENTAGE" ? Number.parseInt(rawValue, 10) : parseMajorToMinor(rawValue);
  const schema = z.object({
    id: z.string().uuid().optional().or(z.literal("")),
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, "3–40 letters, numbers, _ or -"),
    description: z.string().trim().max(200).optional(),
    value: z.number({ invalid_type_error: "Enter a value" }).int().positive("Must be positive"),
    usageLimit: z.coerce.number().int().positive().nullable(),
    perCustomerLimit: z.coerce.number().int().positive().nullable(),
    startsAt: z.coerce.date().nullable(),
    expiresAt: z.coerce.date().nullable(),
  });
  const n = (k: string) => (String(formData.get(k) ?? "").trim() === "" ? null : formData.get(k));
  const parsed = schema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    description: formData.get("description") ?? undefined,
    value,
    usageLimit: n("usageLimit"),
    perCustomerLimit: n("perCustomerLimit"),
    startsAt: n("startsAt"),
    expiresAt: n("expiresAt"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (type === "PERCENTAGE" && d.value > 100) return { fieldErrors: { value: "Percentage can't exceed 100" } };
  if (d.startsAt && d.expiresAt && d.expiresAt <= d.startsAt) return { fieldErrors: { expiresAt: "Must be after the start date" } };
  const data = {
    code: d.code,
    description: d.description || null,
    type: type as "PERCENTAGE" | "FIXED_AMOUNT",
    value: d.value,
    minOrderMinor: money(formData.get("minOrder")),
    maxDiscountMinor: money(formData.get("maxDiscount")),
    usageLimit: d.usageLimit,
    perCustomerLimit: d.perCustomerLimit,
    startsAt: d.startsAt,
    expiresAt: d.expiresAt,
    isActive: formData.get("isActive") === "on",
    eligibleCategoryIds: formData.getAll("eligibleCategoryIds").map(String).filter((x) => /^[0-9a-f-]{36}$/i.test(x)),
  };
  try {
    const saved = d.id ? await db.discountCode.update({ where: { id: d.id }, data }) : await db.discountCode.create({ data });
    await audit(actor.id, d.id ? "discount.update" : "discount.create", "discount_code", saved.id, { code: d.code });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { fieldErrors: { code: "Code already exists" } };
    throw err;
  }
  revalidatePath("/admin/discounts");
  return { success: "Discount saved." };
}

// ───────── Shipping ─────────

export async function saveShippingZoneAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("shipping:manage");
  const fee = money(formData.get("fee"));
  if (fee === null) return { fieldErrors: { fee: "Enter a fee (0 for free)" } };
  const schema = z.object({
    id: z.string().uuid().optional().or(z.literal("")),
    name: z.string().trim().min(2).max(80),
    estimatedDaysMin: z.coerce.number().int().min(0).max(60),
    estimatedDaysMax: z.coerce.number().int().min(0).max(60),
    sortOrder: z.coerce.number().int().min(0).max(999),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.estimatedDaysMax < d.estimatedDaysMin) return { fieldErrors: { estimatedDaysMax: "Must be ≥ minimum" } };
  const data = {
    name: d.name,
    regions: formData.getAll("regions").map(String),
    feeMinor: fee,
    freeShippingThreshold: money(formData.get("freeOver")),
    estimatedDaysMin: d.estimatedDaysMin,
    estimatedDaysMax: d.estimatedDaysMax,
    codAvailable: formData.get("codAvailable") === "on",
    isActive: formData.get("isActive") === "on",
    sortOrder: d.sortOrder,
  };
  const saved = d.id ? await db.shippingZone.update({ where: { id: d.id }, data }) : await db.shippingZone.create({ data });
  await audit(actor.id, d.id ? "shipping.update" : "shipping.create", "shipping_zone", saved.id, { name: d.name, feeMinor: fee });
  revalidatePath("/admin/shipping");
  return { success: "Shipping zone saved." };
}

// ───────── Content ─────────

const BLOCK_SCHEMAS = { announcement: announcementSchema, hero: heroSchema, benefits: benefitsSchema, promo: promoSchema } as const;
const SETTING_SCHEMAS = { navigation: navigationSchema, footer: footerSchema } as const;

export async function saveContentBlockAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("content:manage");
  const key = z.string().regex(/^[a-z0-9-]{2,40}$/).parse(formData.get("key"));
  const type = z.enum(["announcement", "hero", "benefits", "promo"]).parse(formData.get("type"));
  let json: unknown;
  try {
    json = JSON.parse(String(formData.get("data") ?? ""));
  } catch {
    return { error: "Invalid JSON." };
  }
  const parsed = BLOCK_SCHEMAS[type].safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const isActive = formData.get("isActive") === "on";
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  await db.contentBlock.upsert({
    where: { key },
    create: { key, type, data: parsed.data as Prisma.InputJsonValue, isActive, sortOrder },
    update: { data: parsed.data as Prisma.InputJsonValue, isActive, sortOrder },
  });
  await audit(actor.id, "content.update", "content_block", key);
  revalidatePath("/", "layout");
  return { success: "Saved — changes are live." };
}

export async function deleteContentBlockAction(formData: FormData) {
  const actor = await assertPermission("content:manage");
  const key = String(formData.get("key"));
  await db.contentBlock.deleteMany({ where: { key, type: "promo" } });
  await audit(actor.id, "content.delete", "content_block", key);
  revalidatePath("/", "layout");
}

export async function saveSettingAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("content:manage");
  const key = z.enum(["navigation", "footer"]).parse(formData.get("key"));
  let json: unknown;
  try {
    json = JSON.parse(String(formData.get("data") ?? ""));
  } catch {
    return { error: "Invalid JSON." };
  }
  const parsed = SETTING_SCHEMAS[key].safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  await db.siteSetting.upsert({ where: { key }, create: { key, value: parsed.data }, update: { value: parsed.data } });
  await audit(actor.id, "setting.update", "site_setting", key);
  revalidatePath("/", "layout");
  return { success: "Saved — changes are live." };
}

export async function savePageAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("content:manage");
  const parsed = z
    .object({ slug: z.enum(["about", "shipping-returns", "privacy", "terms"]), title: z.string().trim().min(2).max(120), body: z.string().max(50_000), seoDescription: z.string().max(170).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { slug, ...rest } = parsed.data;
  await db.page.upsert({ where: { slug }, create: { slug, ...rest }, update: rest });
  await audit(actor.id, "page.update", "page", slug);
  revalidatePath("/", "layout");
  return { success: "Page saved." };
}

export async function saveFaqAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("content:manage");
  const parsed = z
    .object({ id: z.string().uuid().optional().or(z.literal("")), question: z.string().trim().min(5).max(300), answer: z.string().trim().min(2).max(3000), sortOrder: z.coerce.number().int().min(0).max(999) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  const isVisible = formData.get("isVisible") === "on";
  const saved = id ? await db.faq.update({ where: { id }, data: { ...data, isVisible } }) : await db.faq.create({ data: { ...data, isVisible } });
  await audit(actor.id, "faq.save", "faq", saved.id);
  revalidatePath("/faq");
  return { success: "FAQ saved." };
}

export async function deleteFaqAction(formData: FormData) {
  const actor = await assertPermission("content:manage");
  const id = z.string().uuid().parse(formData.get("id"));
  await db.faq.delete({ where: { id } });
  await audit(actor.id, "faq.delete", "faq", id);
  revalidatePath("/faq");
  revalidatePath("/admin/content");
}

// ───────── Customers ─────────

export async function addCustomerNoteAction(formData: FormData) {
  const actor = await assertPermission("customers:pii");
  const customerId = z.string().uuid().parse(formData.get("customerId"));
  const body = z.string().trim().min(1).max(2000).parse(formData.get("body"));
  await db.customerNote.create({ data: { customerId, authorId: actor.id, body } });
  revalidatePath(`/admin/customers/${customerId}`);
}

// ───────── Staff (Super Admin only) ─────────

const STAFF_ROLE_OPTIONS = ["SUPER_ADMIN", "STORE_MANAGER", "FULFILLMENT"] as const;

export async function createStaffAction(_: State, formData: FormData): Promise<State> {
  const actor = await assertPermission("staff:manage");
  const parsed = z
    .object({ name: z.string().trim().min(2).max(100), email: emailSchema, password: passwordSchema, role: z.enum(STAFF_ROLE_OPTIONS) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, email, password, role } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.userRole.upsert({ where: { userId_role: { userId: existing.id, role } }, create: { userId: existing.id, role }, update: {} });
    await audit(actor.id, "staff.grant_role", "user", existing.id, { role });
    revalidatePath("/admin/staff");
    return { success: `${role} granted to existing account ${email}.` };
  }
  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), emailVerifiedAt: new Date(), roles: { create: [{ role }] } },
  });
  await audit(actor.id, "staff.create", "user", user.id, { role });
  revalidatePath("/admin/staff");
  return { success: "Staff account created." };
}

export async function updateStaffRoleAction(formData: FormData) {
  const actor = await assertPermission("staff:manage");
  const userId = z.string().uuid().parse(formData.get("userId"));
  const role = z.enum([...STAFF_ROLE_OPTIONS, "NONE"]).parse(formData.get("role"));
  if (userId === actor.id) throw new Error("You can't change your own role.");
  await db.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId, role: { in: [...STAFF_ROLE_OPTIONS] as Role[] } } });
    if (role !== "NONE") await tx.userRole.create({ data: { userId, role } });
    // Ensure at least one active super admin remains.
    const supers = await tx.userRole.count({ where: { role: "SUPER_ADMIN", user: { isActive: true } } });
    if (supers === 0) throw new Error("At least one Super Admin is required.");
    await tx.session.deleteMany({ where: { userId } }); // force re-login with new permissions
  });
  await audit(actor.id, "staff.role_change", "user", userId, { role });
  revalidatePath("/admin/staff");
}

export async function toggleStaffActiveAction(formData: FormData) {
  const actor = await assertPermission("staff:manage");
  const userId = z.string().uuid().parse(formData.get("userId"));
  if (userId === actor.id) throw new Error("You can't deactivate yourself.");
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { isActive: !user.isActive } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
  await audit(actor.id, user.isActive ? "staff.deactivate" : "staff.activate", "user", userId);
  revalidatePath("/admin/staff");
}
