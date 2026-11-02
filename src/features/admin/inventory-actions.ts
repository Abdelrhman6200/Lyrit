"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { adjustStock, InsufficientStockError, setStock } from "@/features/inventory/service";

const schema = z.object({
  variantId: z.string().uuid(),
  mode: z.enum(["delta", "set"]),
  amount: z.coerce.number().int().min(-100_000).max(100_000),
  reason: z.enum(["RESTOCK", "ADJUSTMENT", "DAMAGED", "RETURN"]),
  note: z.string().trim().max(300).optional(),
});

export async function adjustInventoryAction(_: { error?: string; success?: string } | undefined, formData: FormData) {
  const actor = await assertPermission("inventory:manage");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid whole number." };
  const { variantId, mode, amount, reason, note } = parsed.data;
  if (mode === "set" && amount < 0) return { error: "Stock can't be negative." };
  if (mode === "delta" && amount === 0) return { error: "Enter a non-zero adjustment." };
  try {
    const balance = await db.$transaction((tx) =>
      mode === "set"
        ? setStock(tx, { variantId, quantity: amount, reason, note, actorId: actor.id })
        : adjustStock(tx, { variantId, delta: amount, reason, note, actorId: actor.id }),
    );
    await audit(actor.id, "inventory.adjust", "product_variant", variantId, { mode, amount, reason, note: note ?? null, balance });
    revalidatePath("/admin/inventory");
    revalidatePath("/", "layout");
    return { success: `Stock updated — now ${balance}.` };
  } catch (err) {
    if (err instanceof InsufficientStockError) return { error: "That would make stock negative." };
    throw err;
  }
}
