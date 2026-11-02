import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/features/payments/provider";
import { processPaymentWebhook } from "@/features/payments/webhooks";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params;
  let provider;
  try {
    provider = getPaymentProvider(providerName);
  } catch {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }
  const raw = await req.text();
  if (raw.length > 256_000) return NextResponse.json({ error: "payload too large" }, { status: 413 });

  let event;
  try {
    event = await provider.parseWebhook(raw, req.headers);
  } catch (err) {
    console.warn("[webhook] rejected", { provider: providerName, reason: String(err) });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    const outcome = await processPaymentWebhook(provider.name, event);
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    console.error("[webhook] processing failed", { provider: providerName, eventId: event.eventId, error: String(err) });
    // Non-2xx so the gateway retries; processing is idempotent.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
