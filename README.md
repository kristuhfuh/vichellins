# Vichellins Nation

Storefront and admin for a Lagos gadget store. Next.js (App Router), Tailwind, Supabase (Postgres, Auth, Storage).

## Run it

```bash
npm install
npm run dev          # storefront on http://localhost:3000 (runs on sample data, no backend needed)
```

To use the admin you need a Supabase backend. Locally, with Docker running:

```bash
npm run stack:up -- you@example.com 'a-strong-password'   # starts Postgres, Auth, API, Storage; applies migrations; creates the owner
# copy the three NEXT_PUBLIC_SUPABASE_* / SUPABASE_SERVICE_ROLE_KEY lines it prints into .env.local
npm run dev
# open http://localhost:3000/admin and sign in
npm run stack:down                                         # stop (data is kept)
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test:db`.

## Status

| Area | State |
|---|---|
| Storefront (home, shop, categories, product, cart, checkout, info pages) | Built, runs on sample data in `src/lib/sample-data.ts` |
| Checkout | Sends the order to the store's WhatsApp with a full summary. It does not save an order |
| Admin | Built and tested against a real Postgres, Auth, API and Storage stack (see below) |
| Storefront reading the real catalogue | **Not done.** Products added in the admin do not appear in the shop yet |
| Website checkout saving orders | **Not done.** The `place_order` database function is ready and is what the admin's "Record an order" uses |
| Payments | Not started. Provider undecided |
| Shopper tracking events (page views, add to cart) | Not recorded yet, so Analytics funnel stays empty until the storefront is connected |
| Settings and content editing (hero, FAQ, contact details) | Not built: nothing in the shop reads them yet |

## Admin

Sign in at `/admin`. Roles: **owner** (everything, plus staff accounts), **staff** (orders, products, stock, delivery, discounts, analytics), **editor** (categories, spec fields, brands).

- **Dashboard and analytics:** sales per day, best sellers, low stock, what needs attention, funnel and sources.
- **Orders:** list and search, status workflow (pending, confirmed, packed, out for delivery, delivered; cancel or refund), payment status, staff notes, printable invoice and packing slip, and "Record an order" for WhatsApp, Instagram or phone orders.
- **Products:** variants (colour, storage, RAM), warranty and authenticity, spec fields that depend on the category, photo upload, draft/published/archived.
- **Categories and spec fields:** create categories with optional JPG, PNG or WebP artwork (up to 5 MB), replace or remove images, and define spec fields. Category card artwork stays anchored to the right on every screen size; cards highlight on a staggered seven-second cycle and respect reduced motion. Spec fields are inherited by sub-categories and can become shop filters.
- **Inventory:** every stock change is logged with who and why. Sales and cancellations adjust stock automatically. Editing a product never changes stock.
- **Delivery zones, discount codes, staff accounts, your own password.**

Things worth knowing:
- Order numbers can skip (VN-01018, VN-01020). A failed attempt still uses up a number. This is normal for database sequences.
- Variants are never deleted, only made inactive, because orders and stock history point at them.
- Stock is reserved when an order is placed and returned if it is cancelled. A refund does not add stock back; adjust it in Inventory if the item comes back in good condition.
- Staff accounts get a temporary password shown once. There is no email sending set up yet.

## Layout

- `src/app/(site)` is the storefront. `src/app/(admin)` is the admin, behind `src/proxy.ts` (session refresh) and a role check on every page and action (`src/lib/admin/auth.ts`).
- `src/lib/catalog.ts` is the only read path to products for the storefront. Connecting the shop to Supabase should only touch this file.
- `src/lib/config.ts` holds store details, delivery zones and policy values. **Fees, return window and business hours are placeholders** the client must confirm.
- `supabase/migrations` holds the schema, row-level security and database functions. Customers create orders only through `place_order`, which prices the order from the database and locks stock rows. Staff change stock and order status only through `adjust_stock` and `set_order_status`.
- `supabase/local-stack` is the Docker setup behind `npm run stack:up`.
- `SUPABASE_SERVICE_ROLE_KEY` is used in one file (`src/lib/supabase/service.ts`) and only for owner-only staff actions.

## Tests

`npm run test:db` applies the migrations to an in-memory Postgres and attacks them as a shopper, a customer, an editor and the owner (142 checks, including category artwork permissions). The admin screens were also driven end to end in a browser against the local stack.

Category artwork is stored in the existing public `product-images` bucket under `categories/<category-id>/`. The base category schema already includes `image_url`, so existing projects with product image uploads configured need no additional migration.

## Before launch

Real product photos, real policy copy (return window, hours, delivery fees), a legal read of the privacy and terms pages, a hosted Supabase project, and a decision on payments.
