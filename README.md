# Vichellins Nation

Storefront and admin for a Lagos gadget store. Next.js (App Router), Tailwind, Supabase (Postgres).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
npm run typecheck
npm run test:db    # applies the SQL migrations to an in-memory Postgres and attacks them
```

Copy `.env.example` to `.env.local` and set the WhatsApp number before sharing the site.

## Status

| Area | State |
|---|---|
| Storefront (home, shop, categories, product, cart, checkout, info pages) | Built, running on sample data in `src/lib/sample-data.ts` |
| Checkout | Sends the order to the store's WhatsApp with a full summary. No order is saved yet |
| Database schema (`supabase/migrations`) | Written and tested; not yet connected to the app |
| Admin / CMS | Not started |
| Payments | Not started. Provider undecided (Paystack, Flutterwave, bank transfer, pay on delivery) |

## Layout

- `src/lib/catalog.ts` is the only read path to products. Swapping sample data for Supabase should only touch this file.
- `src/lib/config.ts` holds store details, delivery zones and policy values. **Fees, return window and business hours are placeholders** the client must confirm.
- `supabase/migrations/0001_init.sql` holds the schema, row-level security and the order functions. Customers create orders only through `place_order`, which prices the order from the database and locks stock rows.
- Brand colours are tokens in `src/app/globals.css`. Gold is a fill colour (pair with navy text); `gold-700` is the only gold that is readable as text on white.

## Not done yet

Product photos (illustrations are placeholders), real policy copy, analytics pixels, order tracking page, admin.
