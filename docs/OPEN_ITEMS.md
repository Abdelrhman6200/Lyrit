# Open items & client decisions (PRD §28)

| # | Item | Current state in code |
|---|---|---|
| 1 | Payment gateway selection | Provider interface + mock. Add the adapter once a merchant account is approved (`features/payments/provider.ts`). |
| 2 | Transactional email provider | `EMAIL_TRANSPORT=console`. Add an adapter in `features/notifications/email.ts` (Resend/Postmark/SES/SMTP). Sending is already deduped and logged. |
| 3 | Newsletter / marketing provider | Subscribers are stored with consent timestamps. Syncing to a provider is not built yet. |
| 4 | Languages (Arabic/RTL) | English only. Needs a decision, then i18n routing, translated content fields, an Arabic font pair and RTL QA. |
| 5 | Brand assets, photography, copy | All imagery is generated SVG placeholders, and copy, prices and ingredients are placeholders. Replace them via the admin. |
| 6 | Policies (shipping, returns, privacy, terms) | Placeholder text, editable in Admin → Storefront content. |
| 7 | Shipping coverage & fees | Sample zones (Cairo/Giza, Delta, rest of Egypt). Configure in Admin → Shipping. |
| 8 | Product claims | No unverified claims are shown. Review every benefit line before launch. |
| 9 | Media storage | Local disk volume. Move to S3-compatible storage if the catalogue or traffic grows. |
| 10 | Analytics (GA4) | Not included. Add it together with a consent banner. |
| 11 | Error monitoring | Health endpoint only. Add Sentry or equivalent. |
| 12 | Dependency upgrades | `npm audit` flags advisories that are fixed in zod 4 / Next 16 / Prisma 7. Plan an upgrade sprint before launch. |
| 13 | Reviews, wishlist, quiz, loyalty | Phase 2/3 per the PRD, not built. |

Known limitation: an unknown `/collections/<slug>` renders the not-found page (with `noindex`) but returns HTTP 200 because of how Next.js streams that route. Products and static pages return a real 404.
