# brüe Coffee — storefront starter

A responsive editorial-style Egyptian coffee storefront with a product catalogue, shopping cart, cash-on-delivery checkout and a demo order dashboard.

## Run locally
Open `index.html` in a modern browser, or serve this folder with a local static server. Add products or change prices in `app.js`.

## Included
- Editorial dark espresso / warm cream visual direction
- Brazilian, Turkish, Colombian and house espresso blend sample listings
- Shopping cart with quantity controls
- Checkout form collecting customer name, phone, governorate, address and notes
- Cash-on-delivery selection
- Demo admin page at `admin.html` with order statuses and CSV export
- Contact email and phone supplied for brüe
- Starter Supabase SQL schema

## Important before going live
This package is a front-end prototype. For easy testing, cart and orders use browser `localStorage`. That means orders are only visible in the same browser/device that placed them; this is NOT a real multi-customer production order system, and no email/WhatsApp notification is sent.

To launch the real store:
1. Create a Supabase project and run `supabase_schema.sql`.
2. Add a secure server-side order endpoint (Supabase Edge Function or your own backend) that validates prices against a trusted product catalogue, validates customer input, inserts the order, and sends an email notification.
3. Protect the admin dashboard with authenticated admin access and server-side authorization. Never expose a Supabase service-role key in browser code.
4. Connect a verified email provider for order alerts and optionally WhatsApp Business Platform for notifications.
5. Confirm real suppliers, coffee origins, roast profiles, stock, product photos and final prices before publishing. Current product descriptions/prices are sample catalogue content, not verified inventory.
6. Add delivery zones/fees, privacy policy, returns policy and business details before accepting real orders.

## Contact
Email: eyadwarda06@gmail.com
Phone: 01098096407
WhatsApp link: https://wa.me/201098096407
