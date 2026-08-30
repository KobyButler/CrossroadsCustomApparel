# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Admin (Koby, sole operator):** owns and runs the whole business through the admin dashboard — creating shops/products, managing orders, handling payments and pay-at-pickup, printing packing lists and shipping labels, and placing vendor restock orders. No other staff accounts are in active use.
- **Group-shop customers:** individual members of a group (a booster club/team, a corporate/workplace group, a community org, or a one-off event) who receive a shared shop link, browse that group's product selection, and check out individually. Orders from everyone in the group are batched together in the admin for one fulfillment run. No dominant group type — the customer base is genuinely mixed across school/team, corporate, and community/event groups.

## Product Purpose

Order management platform for Crossroads Custom Apparel, a screen printing & embroidery business. It replaces running the business through Shopify/Etsy, removing platform fees and adding features built specifically for bulk group orders — the group-shop model, batched fulfillment, and direct vendor integration. Success is a group's members ordering individually without friction, and Koby fulfilling the whole batch efficiently from one admin.

## Positioning

Zero platform fees (unlike Shopify/Etsy) combined with a group-order mechanism a generic storefront doesn't offer: one shop link per group, individual checkout, batched fulfillment. The business's own in-house screen printing and embroidery production is a further differentiator — this isn't a dropship reseller; garments are decorated in-house, which is a durable fact future copy/positioning must not contradict (e.g. no claims implying a third-party print vendor does the decoration).

## Operating Context

- Admin creates a **Shop** tied to a **Collection** of products; the shop gets a unique slug URL (`/shop/[slug]`) shared with the group.
- Customers browse, pick size/color, check out with contact + shipping info, and pay online (Stripe: card, Apple Pay, Google Pay) or choose pay-at-pickup (order held as `OFFLINE_PENDING` until settled in person).
- Admin batches and fulfills orders per shop: printing packing lists/order sheets, purchasing shipping labels, and placing restock POs with vendors (SanMar via SOAP, S&S Activewear via REST) as fire-and-forget jobs whose results land on the order record.
- Admin also tracks finance, discounts, marketing/content, and analytics for the business.

## Capabilities and Constraints

- Prices are stored in cents (integers); the UI converts to/from dollars.
- SQLite on a persistent volume is the database; deploy target is Render (API) + Vercel (frontend).
- Auth is JWT-based, single "admin" role in practice today (schema allows a `role` field on `User` for future expansion, but nothing beyond admin is exercised).
- Vendor fulfillment (SanMar, S&S Activewear) requires per-vendor credentials/whitelisting and is optional per environment (`SANMAR_ENABLE` / `SS_ENABLE`).
- Shipping labels are purchased and stored as hosted PDFs with tracking/carrier metadata on the order.

## Brand Commitments

- Name: **Crossroads Custom Apparel**.
- An implemented visual identity already exists in the codebase (violet/purple brand palette, dark sidebar, existing logo at `web/public/logo.png`) — treat this as the incumbent visual world to document or refine, not to replace outright without a deliberate redesign decision.

## Evidence on Hand

- Sample storefront shop: `panthers-boosters-1234` (a booster-club-style example shop, seed data — not a real customer testimonial).
- No customer testimonials, press, or case studies exist; future work must not fabricate them.

## Product Principles

1. Individual checkout, batched fulfillment — the group-shop model is the core mechanic; never design around a single-customer-per-order assumption.
2. Zero platform fees is a standing commitment — no design or flow should imply per-transaction platform markup to the group or its members.
3. In-house production is real — copy and imagery should reflect garments being decorated by the business itself, not a third-party dropship pipeline.
4. One sole admin operator — admin UI should optimize for a single power user moving fast across many shops/orders, not for multi-role permissions or handoff workflows.
5. Mixed customer base — nothing in shop-facing design should assume a specific group type (school vs. corporate vs. community); it must read as legitimate for all of them.
