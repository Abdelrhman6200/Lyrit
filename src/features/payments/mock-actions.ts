"use server";

import { redirect } from "next/navigation";
import { randomToken, hmacSha256 } from "@/lib/crypto";
import { absoluteUrl } from "@/lib/utils";

export async function simulateMockPayment(formData: FormData) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") throw new Error("Disabled");
  const outcome = formData.get("outcome") === "succeeded" ? "succeeded" : "failed";
  const body = JSON.stringify({
    id: `evt_${randomToken(12)}`,
    type: `payment.${outcome}`,
    reference: String(formData.get("ref")),
    amount: Number(formData.get("amount")),
    currency: String(formData.get("currency")),
    failureReason: outcome === "failed" ? "Card declined (simulated)" : undefined,
  });
  const signature = hmacSha256(process.env.PAYMENT_WEBHOOK_SECRET ?? "", body);
  // Deliver through the real webhook endpoint, exactly like a gateway would.
  const res = await fetch(absoluteUrl("/api/webhooks/payments/mock"), {
    method: "POST",
    headers: { "content-type": "application/json", "x-lyrit-signature": signature },
    body,
  });
  if (!res.ok) console.error("[mock-gateway] webhook delivery failed", res.status);
  const ret = String(formData.get("return"));
  redirect(ret.startsWith(absoluteUrl("/")) ? ret : "/");
}
