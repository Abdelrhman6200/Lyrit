import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { absoluteUrl } from "@/lib/utils";

export type EmailMessage = { to: string; subject: string; text: string; html: string };

/** Transport abstraction. "console" for development; plug in the chosen transactional provider here. */
async function deliver(message: EmailMessage) {
  const transport = process.env.EMAIL_TRANSPORT ?? "console";
  if (transport === "console") {
    console.info(`\n──── email → ${message.to} ────\nSubject: ${message.subject}\n\n${message.text}\n────────────────\n`);
    return;
  }
  throw new Error(`Email transport "${transport}" is not configured`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, paragraphs: string[], cta?: { label: string; href: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`).join("");
  const button = cta
    ? `<p><a href="${cta.href}" style="display:inline-block;background:#173D2F;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none">${escapeHtml(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="background:#F8F5EF;font-family:Helvetica,Arial,sans-serif;color:#282522;padding:32px">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
<p style="font-family:Georgia,serif;font-size:24px;letter-spacing:4px;margin:0 0 24px">LYRIT</p>
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px">${escapeHtml(title)}</h1>${body}${button}
</div></body></html>`;
}

/**
 * Sends a message at most once per dedupe key. Failures are logged (and can be retried) but never
 * roll back the business transaction that triggered them.
 */
export async function sendOnce(dedupeKey: string, template: string, message: EmailMessage) {
  try {
    await db.notificationLog.create({ data: { dedupeKey, recipient: message.to, template, status: "SENDING" } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const prev = await db.notificationLog.findUnique({ where: { dedupeKey } });
      if (prev?.status !== "FAILED") return; // already sent or in flight
    } else {
      console.error("[email] could not record notification", err);
      return;
    }
  }
  try {
    await deliver(message);
    await db.notificationLog.update({ where: { dedupeKey }, data: { status: "SENT", error: null } });
  } catch (err) {
    console.error("[email] delivery failed", { dedupeKey, template, error: String(err) });
    await db.notificationLog.update({ where: { dedupeKey }, data: { status: "FAILED", error: String(err).slice(0, 500) } });
  }
}

export type OrderTemplate = "order_confirmation" | "payment_confirmed" | "order_shipped" | "order_delivered" | "order_canceled";

export async function sendOrderNotification(orderId: string, template: OrderTemplate) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true, shipments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order) return;
  const link = absoluteUrl(`/order/confirmation/${order.publicToken}`);
  const itemsText = order.items.map((i) => `• ${i.productName} (${i.variantName}) × ${i.quantity} — ${formatMoney(i.lineTotalMinor, order.currency)}`);
  const total = `Total: ${formatMoney(order.totalMinor, order.currency)}`;
  const shipment = order.shipments[0];

  const content: Record<OrderTemplate, { subject: string; title: string; lines: string[] }> = {
    order_confirmation: {
      subject: `Your LYRIT order ${order.orderNumber}`,
      title: `Thank you, ${order.customerName.split(" ")[0]}`,
      lines: ["We've received your order and will let you know when it ships.", ...itemsText, total, order.paymentMethod === "COD" ? "Payment: cash on delivery." : ""],
    },
    payment_confirmed: {
      subject: `Payment received — order ${order.orderNumber}`,
      title: "Your payment is confirmed",
      lines: ["Thank you — your payment was successful and your order is now being prepared.", ...itemsText, total],
    },
    order_shipped: {
      subject: `Your order ${order.orderNumber} is on its way`,
      title: "Your order has shipped",
      lines: [
        "Good news — your LYRIT order is on its way.",
        shipment?.carrier ? `Carrier: ${shipment.carrier}` : "",
        shipment?.trackingReference ? `Tracking reference: ${shipment.trackingReference}` : "",
      ],
    },
    order_delivered: {
      subject: `Your order ${order.orderNumber} was delivered`,
      title: "Delivered",
      lines: ["Your order has been delivered. We hope you love it."],
    },
    order_canceled: {
      subject: `Order ${order.orderNumber} canceled`,
      title: "Your order was canceled",
      lines: ["Your order has been canceled. If you were charged, a refund will be issued to the original payment method."],
    },
  };
  const c = content[template];
  const lines = c.lines.filter(Boolean);
  await sendOnce(`order:${order.id}:${template}`, template, {
    to: order.customerEmail,
    subject: c.subject,
    text: `${c.title}\n\n${lines.join("\n")}\n\nView your order: ${link}`,
    html: layout(c.title, lines, { label: "View order", href: link }),
  });
}

export async function sendAuthEmail(kind: "verify" | "reset", to: string, link: string, dedupeKey: string) {
  const c =
    kind === "verify"
      ? { subject: "Verify your LYRIT account", title: "Confirm your email", lines: ["Please confirm your email address to finish setting up your account. This link expires in 24 hours."], label: "Verify email" }
      : { subject: "Reset your LYRIT password", title: "Reset your password", lines: ["We received a request to reset your password. This link expires in 1 hour. If you didn't ask for this, you can ignore this email."], label: "Reset password" };
  await sendOnce(dedupeKey, kind === "verify" ? "account_verification" : "password_reset", {
    to,
    subject: c.subject,
    text: `${c.title}\n\n${c.lines.join("\n")}\n\n${link}`,
    html: layout(c.title, c.lines, { label: c.label, href: link }),
  });
}
