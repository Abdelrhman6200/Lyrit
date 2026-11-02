# Architecture

## Principles
- **The server is the source of truth for money and stock.** The browser only ever sends IDs and quantities. Prices, discounts, shipping and totals are recomputed in `features/checkout/quote.ts` for every cart view, and authoritatively inside `placeOrder`.
- **Money is integer minor units** (piasters). `lib/money.ts` parses admin input without floats. Totals use `computeTotals`.
- **Business logic lives in `src/features/*`**, separate from pages. Pure rule modules (`discounts/rules.ts`, `shipping/rules.ts`, `checkout/totals.ts`, `orders/status.ts`, `lib/auth/roles.ts`) are unit-tested.
- **Every sensitive operation** (server action or route handler) re-checks the session and permission on the server with `assertPermission` / `requireStaff`. The middleware is only a fast pre-check.

## Commerce integrity (PRD §21)
| Rule | Enforcement |
|---|---|
| No overselling / atomic stock | `inventory/service.adjustStock` does a conditional `UPDATE … WHERE stock + delta >= 0`, inside the order transaction. A DB `CHECK (stock_quantity >= 0)` backs it up. Integration test covers 12 concurrent buyers for 5 units. |
| Inventory history | Every change writes an `inventory_movements` row with its reason, actor, order and running balance |
| Server-side prices/discounts | `quoteCart` + `evaluateDiscount`. The discount usage limit is enforced by a conditional increment inside the order transaction. |
| Never "paid" from a redirect | Only `processPaymentWebhook` sets `PAID` for online payments. The confirmation page just polls. |
| Duplicate webhooks | `payment_webhook_events (provider, event_id)` is unique. Payment state changes use conditional `updateMany`. Notifications are deduped by `notification_logs.dedupe_key`. |
| Amount tampering | Webhook amount/currency must match the stored payment, or the order is flagged for review |
| Payment vs. fulfilment independent | Separate `payment_status`, `fulfillment_status`, `order_status`. Transitions are in `orders/status.ts`. |
| Historical prices | `order_items` snapshot name, variant, SKU, image and unit price |
| Cancel/refund stock rules | `releaseOrderStock` restores stock exactly once (`stock_restored_at` claim) and releases discount usage. Refunds can optionally restock. |
| Abandoned online payments | `POST /api/cron/expire-orders` (Bearer `CRON_SECRET`) cancels PENDING orders older than 60 minutes and restores their stock |
| Publish completeness | Products need a description, image, priced variant and category before they can be `PUBLISHED` |
| Auditable admin actions | `audit_logs` record product, inventory, order, discount, content, staff and export actions, with IP |

## Order lifecycle
- **COD:** `CONFIRMED` + `UNPAID` at placement. It becomes `PAID` when staff mark the cash collected, or automatically on `DELIVERED`.
- **Card/wallet:** `PENDING` + `PENDING`. A verified `payment.succeeded` webhook moves it to `CONFIRMED` + `PAID`. `payment.failed` moves it to `FAILED`, and the stock is released by the expiry job.
- Fulfilment runs `UNFULFILLED → PROCESSING → SHIPPED → DELIVERED`, with `RETURNED` possible from shipped or delivered. It is only allowed on confirmed orders.

## Payments
`features/payments/provider.ts` defines `PaymentProvider` (`initiate`, `parseWebhook`). To add the approved Egyptian gateway (Paymob, Kashier, Fawry, …):
1. Implement `initiate` with the provider's hosted checkout / iframe, and `parseWebhook` with its HMAC verification.
2. Register it in `providers` and set `PAYMENT_PROVIDER`.
3. Point the gateway's webhook URL at `https://<domain>/api/webhooks/payments/<name>`.

The mock provider is refused when `NODE_ENV=production` unless `ALLOW_MOCK_PAYMENTS=true`.

## Auth
- Custom DB sessions: a random 256-bit token sits in an httpOnly cookie, and only its SHA-256 is stored in the database. Sessions last 30 days for customers and 12 hours for staff.
- Passwords use bcrypt (cost 12).
- Login, register, forgot-password, checkout, newsletter and contact are rate-limited with a PostgreSQL fixed-window limiter.
- Login is resistant to account enumeration: equalised timing and generic messages.
- Email-verification and reset tokens are single-use, hashed, and expire after 24 hours and 1 hour. A password reset revokes all sessions.
- Guest carts merge into the account cart on sign-in. Quantities are summed and capped at stock and 20 per line.
- Roles: `SUPER_ADMIN`, `STORE_MANAGER`, `FULFILLMENT` (permission matrix in `lib/auth/roles.ts`). Fulfilment staff see masked customer contact details.

## Content management
Announcement bar, hero, benefits, promo blocks (`content_blocks`), navigation and footer (`site_settings`), static pages (`pages`) and FAQs (`faqs`) are all editable in `/admin/content`. Each is validated with Zod (`features/content/types.ts`), and changes go live without a redeploy. Page bodies use a tiny safe markdown subset; raw HTML is never rendered.

## Search
PostgreSQL full-text search: `products.search_vector` (tsvector, GIN index) is maintained by a trigger (migration `search`) and combined with category names and an ILIKE fallback.

## Media
Uploads are checked by magic bytes (JPEG/PNG/WebP/AVIF, ≤ 5 MB) and stored in `UPLOAD_DIR`, served from `/media/*`. Swap `lib/media/storage.ts` for an S3-compatible adapter when needed.

## SEO / performance / accessibility
- Per-page metadata and canonical URLs, Product and FAQ JSON-LD, `sitemap.xml`, and `robots.txt` (blocks crawlers unless `APP_ENV=production`).
- `next/image` with responsive sizes, `next/font` with swap, and server components by default.
- Skip link, focus styles, labelled controls, `aria-live` cart/totals updates, accessible dialogs (Escape and focus return), `prefers-reduced-motion` support, and a muted text colour darkened to meet WCAG AA contrast.

## Internationalisation
English only at launch for now. `<html lang dir>` is set in the root layout, and the money and date formatters take a locale. Arabic/RTL needs the PRD §17 decision first. See `OPEN_ITEMS.md`.
