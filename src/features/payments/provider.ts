import "server-only";
import { hmacSha256, safeEqual } from "@/lib/crypto";
import { absoluteUrl } from "@/lib/utils";

/**
 * Payment gateway abstraction. The final Egyptian gateway (e.g. Paymob, Fawry, Kashier) is pending
 * merchant approval — implement `PaymentProvider` for it and register it in `getPaymentProvider`.
 *
 * Rules (PRD §9.5): use hosted checkout, never touch card data, verify webhook signatures,
 * never mark orders paid from a browser redirect.
 */
export type InitiatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  customer: { name: string; email: string; phone: string };
  returnUrl: string;
};

export type InitiatePaymentResult = { redirectUrl: string; providerReference: string };

export type WebhookEvent = {
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | "payment.refunded" | string;
  providerReference: string;
  amountMinor: number;
  currency: string;
  failureReason?: string;
  raw: unknown;
};

export interface PaymentProvider {
  name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  /** Verifies authenticity and parses the webhook. Throws if the signature is invalid. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent>;
}

/**
 * Development-only provider. Simulates a hosted payment page at /checkout/mock-gateway which
 * posts a signed webhook back to /api/webhooks/payments/mock — exercising the same code path a
 * real gateway would.
 */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async initiate(input) {
    const providerReference = `mock_${input.idempotencyKey}`;
    const url = new URL(absoluteUrl("/checkout/mock-gateway"));
    url.searchParams.set("ref", providerReference);
    url.searchParams.set("amount", String(input.amountMinor));
    url.searchParams.set("currency", input.currency);
    url.searchParams.set("order", input.orderNumber);
    url.searchParams.set("return", input.returnUrl);
    return { redirectUrl: url.toString(), providerReference };
  },
  async parseWebhook(rawBody, headers) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) throw new Error("PAYMENT_WEBHOOK_SECRET is not configured");
    const signature = headers.get("x-lyrit-signature") ?? "";
    if (!safeEqual(signature, hmacSha256(secret, rawBody))) throw new Error("Invalid webhook signature");
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    return {
      eventId: String(body.id),
      type: String(body.type),
      providerReference: String(body.reference),
      amountMinor: Number(body.amount),
      currency: String(body.currency),
      failureReason: body.failureReason ? String(body.failureReason) : undefined,
      raw: body,
    };
  },
};

const providers: Record<string, PaymentProvider> = { mock: mockProvider };

/** True when an online payment provider is configured and allowed in this environment. */
export function isOnlinePaymentAvailable(): boolean {
  if ((process.env.PAYMENT_PROVIDER ?? "mock") === "none") return false;
  try {
    getPaymentProvider();
    return true;
  } catch {
    return false;
  }
}

export function getPaymentProvider(name = process.env.PAYMENT_PROVIDER ?? "mock"): PaymentProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);
  if (provider.name === "mock" && process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    throw new Error("The mock payment provider is disabled in production");
  }
  return provider;
}
