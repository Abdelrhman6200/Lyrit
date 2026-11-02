import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { minorToMajorString } from "@/lib/money";
import { csvEscape } from "@/lib/utils";
import { getBestSellers, getDailySales, parseRange } from "@/features/admin/reports";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.roles, "reports:view")) return new Response("Forbidden", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const range = parseRange({ from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });
  let rows: unknown[][];
  let header: string[];
  if (sp.get("type") === "products") {
    header = ["product", "units", "revenue"];
    rows = (await getBestSellers(range, 1000)).map((r) => [r.name, r.units, minorToMajorString(r.revenueMinor)]);
  } else {
    header = ["date", "orders", "paid_sales"];
    rows = (await getDailySales(range)).map((r) => [r.day, r.orders, minorToMajorString(r.paid)]);
  }
  const body = [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\r\n");
  return new Response("﻿" + body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lyrit-${sp.get("type") ?? "daily"}-report.csv"`, "Cache-Control": "no-store" },
  });
}
