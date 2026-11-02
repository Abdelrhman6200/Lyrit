import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/rate-limit";

export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Prisma.InputJsonValue,
) {
  try {
    await db.auditLog.create({
      data: { actorId, action, entityType, entityId: entityId ?? null, details, ip: await clientIp() },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
