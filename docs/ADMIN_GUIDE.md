# LYRIT Admin Guide

Sign in at `/login` with a staff account. You'll land on `/admin`. What you can see depends on your role.

## Daily operations
1. **Dashboard:** shows the number of orders to fulfil, low-stock variants, and sales for the last 30 days.
2. **Orders → filter "UNFULFILLED":** open each order and check the payment badge.
   - **Card orders** can only be fulfilled once they're `PAID`.
   - **COD orders** are fulfilled straight away and paid on delivery.
3. Move each order to **PROCESSING**, then to **SHIPPED** with the carrier and tracking reference. The customer gets an email.
4. Mark it **DELIVERED** when it arrives. For COD orders this also marks the payment collected.
5. **Cancel** (manager or super admin) restores stock automatically. For paid card orders, also refund in the gateway dashboard, then use **Record refund**.

## Products
- **Products → Add product:** enter the details, upload images (add alt text that describes each image), and add variants (size, SKU, price, stock), then assign a category.
- Save as **Draft**. Switch to **Published** when the product is ready. Publishing requires a description, an image, a price and a category.
- Tick **Featured** to show the product on the homepage. "Featured position" controls the order.
- Removing a variant deactivates it. Order history is kept.
- **Archive** hides a product without deleting it.

## Inventory
Use **Inventory** for restocks and count corrections. Pick a reason every time, because each change is logged. "Set to" overwrites the count after a stocktake.

## Promotions
Under **Discounts** you can create:
- percentage or fixed codes
- minimum order, maximum discount
- total and per-customer limits
- start and expiry dates
- category restrictions

## Storefront content
**Storefront content** covers:
- announcement bar
- hero banner
- benefits
- promo blocks
- navigation and footer links
- the About, Shipping & Returns, Privacy and Terms pages
- FAQs

Edit the fields in the text box. If the save fails, the error message names the field to fix. Use **Upload image** to get an image URL to paste in. Category order and visibility are under **Categories**.

## Shipping
**Shipping** zones group governorates with one flat fee and an optional free-shipping threshold. A zone with no governorates selected covers every remaining area.

## Reports
**Reports** shows a date range with net paid sales, pending, refunded and canceled totals, best sellers, category performance and discount usage. You can export CSV. **Orders → Export CSV** exports the currently filtered orders.

## Staff (Super Admin)
**Staff & roles:**
- create accounts
- change a person's role, which signs them out so the new permissions apply
- disable access

At least one Super Admin must always exist. Every sensitive action is recorded in the **Audit log**.
