# Elliot's Global

A multi-vendor marketplace built with Next.js App Router, React, TypeScript, MongoDB, and Stripe Checkout. The storefront includes a browsable 36-product sample catalog across 12 departments, search and filters, saved finds, product sorting, a persistent cart, product details, a Black Friday countdown, and responsive shopper, seller, and admin experiences.

## What is implemented

- **Shoppers:** create an account, sign in, keep a local cart and favorites, pay through Stripe Checkout, and view order and shipping status.
- **Sellers:** apply for a shop, wait for admin approval, submit listings, edit or archive products, and view sales and the payout amounts due to them.
- **Admins:** approve/reject seller applications and product listings; manage order fulfillment; track each seller's manual payout separately by order and record its transfer reference.
- **Catalog:** 36 example products across Tech & Gadgets, Home & Living, Style, Beauty & Wellness, Outdoors, Food & Drink, Jewelry & Accessories, Books & Paper, Kitchen & Dining, Kids & Family, Pets & Companions, and Toys & Games. The storefront stays usable in clearly labelled preview mode before services are connected.
- **Checkout:** USD, US shipping addresses, $7.95 standard shipping under $75 and free standard shipping at $75+, Stripe Checkout, bounded stock reservations, and signed webhook handling for paid/expired sessions.
- **Marketplace commission:** 15% by default, configurable from 0%–30% with at most two decimals. Commission and seller net payout are snapshotted on each order line; admin payout marking requires a manual-transfer reference.
- **Security:** bcrypt password hashes, signed HttpOnly/SameSite cookies, role checks against MongoDB on protected API requests, Zod request validation, unique email/product identifiers, seller ownership checks, admin-only approval actions, allowlisted HTTPS image hosts, and inventory limits.

## Run the preview

Requirements: Node.js 20.9+ (Node 22 recommended) and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without MongoDB and Stripe credentials, the sample catalog is read-only preview data; account, listing, and checkout APIs report that their service configuration is required rather than pretending to save or charge anything.

## Configure MongoDB and Stripe

1. Create a MongoDB Atlas database and a database user with only the permissions this application needs. Allow connections from your development/deployment host. Set the full connection URI in `.env.local`.
2. Copy `.env.example` to `.env.local`; set a unique random `SESSION_SECRET` of at least 32 characters, `MONGODB_URI`, `APP_URL`, and `PLATFORM_COMMISSION_PERCENT=15`.
3. Create a Stripe account and configure test mode first. Set `STRIPE_SECRET_KEY` in `.env.local`. Never use a publishable key as the server secret, and never commit `.env.local`.
4. Provision the first admin account using a strong, unique password of at least 16 characters:

   ```bash
   npm run seed:admin
   ```

   This reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env.local`. There is no public admin signup. Sign in through the storefront account form; the Admin desk is then available from the account menu.
5. To populate the live database with the 18 sample listings, create a seller account, approve it from the Admin desk, set its email as `CATALOG_SELLER_EMAIL` in `.env.local`, then run:

   ```bash
   npm run seed:catalog
   ```

   The command is idempotent and only attaches sample listings to an already approved seller. Listings created by sellers through the studio always require admin review.
6. For local Stripe webhooks, install the Stripe CLI, then forward events:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   Copy the CLI's signing secret into `STRIPE_WEBHOOK_SECRET`. At minimum, handle `checkout.session.completed` and `checkout.session.expired`.
7. Test a shopper signup, a Stripe test-mode checkout, the account order history, seller approval, product review, fulfillment status, and a manual payout with its transfer reference.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `MONGODB_URI` | Yes for live features | MongoDB Atlas connection string |
| `SESSION_SECRET` | Yes for authentication | Random signing secret, 32+ characters |
| `APP_URL` | Yes for checkout | Exact public app origin, e.g. `https://shop.example.com` |
| `STRIPE_SECRET_KEY` | Yes for checkout | Stripe server-side test/live key |
| `STRIPE_WEBHOOK_SECRET` | Yes for payment status | Stripe webhook signature verification |
| `PLATFORM_COMMISSION_PERCENT` | No | Marketplace share, defaults to 15; allowed range 0–30 |
| `ADMIN_EMAIL` | Admin setup only | Admin seed script account |
| `ADMIN_PASSWORD` | Admin setup only | Admin seed script password, 16+ characters |
| `CATALOG_SELLER_EMAIL` | Sample catalog setup only | Email of an already approved seller account |

Use the Stripe test keys and test cards during development. Do not copy secret keys into frontend variables prefixed with `NEXT_PUBLIC_`.

## Routes

- `/` — storefront, Black Friday feature, product catalog and shopper signup
- `/account` — shopper order history
- `/seller` — seller application information or seller studio
- `/admin` — admin desk (requires a seeded admin account)
- `/api/auth/*` — registration, sign-in, session and sign-out
- `/api/products` — live catalog and approved seller product submissions
- `/api/checkout` — authenticated cart validation, stock reservation and Stripe Checkout
- `/api/checkout/cancel` — authenticated expiry of a cancelled checkout session
- `/api/webhooks/stripe` — signed payment and expired-session handling
- `/api/admin/*` — admin-only seller, product, order, and manual payout actions

## Checks

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

## Before accepting real orders

This is a working marketplace foundation, but live commerce still needs operational decisions and configuration: verified email/password recovery, rate limiting/WAF protection for account and checkout routes, a tax calculation/filing policy, seller terms and identity checks, return/refund handling, shipping labels and tracking, privacy/retention policies, and production monitoring. Stripe currently charges the platform account; seller payouts are **manual**. The admin desk records payout amounts and transfer references but does not initiate bank transfers. The commission is calculated from merchandise only; shipping is collected by Stripe and is not included in seller payout. Stripe processing fees are paid by the platform and are not deducted again from seller net. No tax is currently calculated. Confirm legal, tax, fraud, shipping, and Stripe eligibility requirements before switching to live payments.

## Deployment

Deploy this as a regular Next.js Node application (for example, Vercel) with MongoDB Atlas. Set production environment variables in the host, use Stripe live keys only after end-to-end testing, and register the production webhook URL `https://YOUR_DOMAIN/api/webhooks/stripe`. Add the production origin as `APP_URL`. Never commit `.env.local`, admin passwords, MongoDB credentials, or Stripe secrets.
