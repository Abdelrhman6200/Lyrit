import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { expireStalePendingOrders } from "@/features/payments/webhooks";

export const dynamic = "force-dynamic";

/** Called by a scheduler (e.g. host cron with curl) to release stock held by abandoned online payments. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const expired = await expireStalePendingOrders(60);
  return NextResponse.json({ ok: true, expired });
}
