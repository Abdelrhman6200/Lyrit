import "server-only";
import type { InventoryReason, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class InsufficientStockError extends Error {
  constructor(public readonly variantId: string) {
    super("Insufficient stock");
  }
}

/**
 * Atomically changes stock for a variant and records the movement.
 * Decrements use a conditional UPDATE so concurrent checkouts can never oversell
 * (backed by a CHECK (stock_quantity >= 0) constraint).
 */
export async function adjustStock(
  tx: Tx,
  args: { variantId: string; delta: number; reason: InventoryReason; note?: string; orderId?: string; actorId?: string },
): Promise<number> {
  const { variantId, delta } = args;
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Stock delta must be a non-zero integer");
  const rows = await tx.$queryRaw<{ stock_quantity: number }[]>`
    UPDATE product_variants
    SET stock_quantity = stock_quantity + ${delta}, updated_at = NOW()
    WHERE id = ${variantId}::uuid AND stock_quantity + ${delta} >= 0
    RETURNING stock_quantity`;
  if (rows.length === 0) throw new InsufficientStockError(variantId);
  const balance = rows[0].stock_quantity;
  await tx.inventoryMovement.create({
    data: {
      variantId,
      delta,
      balance,
      reason: args.reason,
      note: args.note,
      orderId: args.orderId,
      actorId: args.actorId,
    },
  });
  return balance;
}

/** Sets an absolute stock level (stock count) as a single recorded movement. */
export async function setStock(
  tx: Tx,
  args: { variantId: string; quantity: number; reason: InventoryReason; note?: string; actorId?: string },
) {
  const variant = await tx.$queryRaw<{ stock_quantity: number }[]>`
    SELECT stock_quantity FROM product_variants WHERE id = ${args.variantId}::uuid FOR UPDATE`;
  if (!variant.length) throw new Error("Variant not found");
  const delta = args.quantity - variant[0].stock_quantity;
  if (delta === 0) return args.quantity;
  return adjustStock(tx, { ...args, delta });
}
