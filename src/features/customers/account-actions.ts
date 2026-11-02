"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { addressSchema, fieldErrors, passwordSchema, phoneSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { FormState } from "./auth-actions";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: phoneSchema.optional().or(z.literal("")),
});

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone || null } });
  revalidatePath("/account");
  return { success: "Profile updated." };
}

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = passwordSchema.safeParse(formData.get("password"));
  if (!next.success) return { fieldErrors: { password: next.error.issues[0].message } };
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, record.passwordHash))) return { fieldErrors: { current: "Current password is incorrect" } };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next.data) } });
  return { success: "Password changed." };
}

export async function saveAddressAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const id = formData.get("id");
  const makeDefault = formData.get("isDefault") === "on";
  const data = {
    ...parsed.data,
    building: parsed.data.building || null,
    apartment: parsed.data.apartment || null,
    instructions: parsed.data.instructions || null,
  };
  await db.$transaction(async (tx) => {
    if (makeDefault) await tx.customerAddress.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    if (typeof id === "string" && id) {
      await tx.customerAddress.updateMany({ where: { id, userId: user.id }, data: { ...data, ...(makeDefault ? { isDefault: true } : {}) } });
    } else {
      const count = await tx.customerAddress.count({ where: { userId: user.id } });
      await tx.customerAddress.create({ data: { ...data, userId: user.id, isDefault: makeDefault || count === 0 } });
    }
  });
  revalidatePath("/account");
  return { success: "Address saved." };
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.customerAddress.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account");
}
