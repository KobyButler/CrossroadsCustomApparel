import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { sendOrderConfirmation } from '../utils/email.js';
import { buildShopGroups, applyDiscountAcrossGroups, allocateShippingAcrossGroups, newOrderGroupId, assertShippingAllowed } from '../utils/checkoutHelpers.js';
import { quoteShipping } from '../utils/shippingCalc.js';
import { quoteOrderTax } from '../utils/tax.js';
import { getStripe } from '../utils/stripeClient.js';

export const router = Router();

async function resolveDiscount(discountCode?: string) {
    if (!discountCode) return null;
    const d = await prisma.discountCode.findFirst({
        where: { code: discountCode, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
    });
    if (d && (d.maxUses === null || d.usedCount < d.maxUses)) return d;
    return null;
}

// Discards a customer's still-unpaid order (and cancels its PaymentIntent) for
// this shop before a new checkout attempt creates another one. Without this,
// every time a customer starts the card-payment step — then hits Back, edits
// their cart, refreshes, or just retries after a network hiccup — a brand new
// UNPAID order gets created alongside whichever attempt they eventually pay
// on, so the same order shows up 2-3x in the admin list (one PAID, the rest
// stuck UNPAID forever). This keeps at most one live pending-payment order
// per (shop, customer) at a time, so a retry replaces the abandoned attempt
// instead of piling up next to it.
//
// Scoped to UNPAID + paymentMethod 'stripe' orders only — orders already PAID,
// or placed for pickup/cash/check, are never touched. If the old PaymentIntent
// turns out to already be succeeded/processing (the customer's previous
// attempt is completing right this moment), it's left alone rather than risk
// deleting an order that's about to be paid.
async function retireStalePendingOrder(shopId: string | null, customerEmail: string) {
    const stale = await prisma.order.findFirst({
        where: { shopId, customerEmail, paymentStatus: 'UNPAID', paymentMethod: 'stripe', status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' }
    });
    if (!stale) return;

    if (stale.stripePaymentIntentId) {
        try {
            const stripe = getStripe();
            const pi = await stripe.paymentIntents.retrieve(stale.stripePaymentIntentId);
            if (pi.status === 'succeeded' || pi.status === 'processing') return; // let it finish — don't touch
            if (pi.status !== 'canceled') await stripe.paymentIntents.cancel(stale.stripePaymentIntentId);
        } catch (err) {
            console.error('[checkout] failed to cancel stale PaymentIntent (continuing anyway):', err);
        }
    }

    await prisma.orderItem.deleteMany({ where: { orderId: stale.id } });
    await prisma.order.delete({ where: { id: stale.id } }).catch(() => {});
}

// ─── POST /api/payments/create-intent ─────────────────────────────────────────
// Called by the storefront checkout when the customer selects online payment.
// Supports a cross-shop cart: items may each carry their own shopSlug (falling
// back to the top-level shopSlug for single-shop carts). Creates one Order per
// shop (sharing an orderGroupId when >1) and a single Stripe PaymentIntent for
// the combined total; returns the clientSecret so the frontend can render the
// Stripe Payment Element.
router.post('/create-intent', async (req: Request, res: Response) => {
    const {
        shopSlug, customerName, customerEmail, shippingMethod,
        shipAddress1, shipAddress2, shipCity, shipState, shipZip,
        residential = true, items, discountCode, specialInstructions
    } = req.body;

    if (!customerEmail || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'customerEmail and items are required' });
    }

    const isShipping = shippingMethod === 'SHIP';
    if (isShipping && (!shipAddress1 || !shipCity || !shipState || !shipZip)) {
        return res.status(400).json({ error: 'A full shipping address is required to ship your order' });
    }

    let groups;
    try {
        groups = await buildShopGroups(items, shopSlug ?? null);
        if (isShipping) assertShippingAllowed(groups);
    } catch (err: any) {
        return res.status(400).json({ error: err.message });
    }

    const discount = await resolveDiscount(discountCode);
    const { groups: discountedGroups, discountedTotal } = applyDiscountAcrossGroups(groups, discount);

    // Shipping is calculated once for the whole checkout and re-derived
    // server-side — never trust a client-supplied shipping cost.
    const shippingQuote = isShipping
        ? await quoteShipping(items.map((i: any) => ({ productId: i.productId, quantity: i.quantity })), { city: shipCity, state: shipState, zip: shipZip, residential })
        : null;
    const shippingCentsTotal = shippingQuote?.cents ?? 0;
    const finalGroups = allocateShippingAcrossGroups(discountedGroups, shippingCentsTotal);

    // Sales tax is calculated once, here, at the point the customer commits to
    // checkout — not live as they type (each Stripe Tax calculation is a billed
    // API call), so the review screen shows an estimate and this step reveals
    // the exact total that actually gets charged.
    const stripe = getStripe();
    const taxQuote = await quoteOrderTax(stripe, {
        groupSubtotals: finalGroups.map(g => g.subtotal),
        shippingCents: shippingCentsTotal,
        shippingMethod: isShipping ? 'SHIP' : 'PICKUP',
        shipAddress: isShipping ? { line1: shipAddress1, line2: shipAddress2, city: shipCity, state: shipState, zip: shipZip } : null
    });
    const grandTotal = discountedTotal + shippingCentsTotal + taxQuote.totalTaxCents;

    // Stripe requires a minimum of 50 cents
    if (grandTotal < 50) {
        return res.status(400).json({ error: 'Order total is too low for card payment (minimum $0.50)' });
    }

    const customer = await prisma.customer.upsert({
        where: { email: customerEmail },
        update: { name: customerName },
        create: { email: customerEmail, name: customerName }
    });

    // Clear out any abandoned/unpaid attempt this same customer left behind for
    // these shops (see retireStalePendingOrder) before starting a fresh one —
    // otherwise a retry piles up as a duplicate instead of replacing it.
    await Promise.all(finalGroups.map(g => retireStalePendingOrder(g.shopId, customerEmail)));

    const orderGroupId = finalGroups.length > 1 ? newOrderGroupId() : null;

    // Create the Stripe PaymentIntent first so every order can be stamped with its id
    const pi = await stripe.paymentIntents.create({
        amount: grandTotal,
        currency: 'usd',
        metadata: { orderGroupId: orderGroupId ?? '', taxCents: String(taxQuote.totalTaxCents) },
        automatic_payment_methods: { enabled: true }
    });

    const createdOrders = [];
    for (let idx = 0; idx < finalGroups.length; idx++) {
        const g = finalGroups[idx];
        const taxCents = taxQuote.taxCentsByGroup[idx] ?? 0;
        const order = await prisma.order.create({
            data: {
                shopId: g.shopId, orderGroupId,
                status: 'UNFULFILLED', paymentStatus: 'UNPAID', paymentMethod: 'stripe',
                stripePaymentIntentId: pi.id,
                stripeTaxCalculationId: taxQuote.calculationId,
                customerId: customer.id, customerName, customerEmail,
                shippingMethod: isShipping ? 'SHIP' : 'PICKUP', shippingCents: g.shippingCents,
                shipAddress1: isShipping ? shipAddress1 : null, shipAddress2: isShipping ? (shipAddress2 ?? null) : null,
                shipCity: isShipping ? shipCity : null, shipState: isShipping ? shipState : null, shipZip: isShipping ? shipZip : null,
                residential,
                specialInstructions: specialInstructions || null,
                taxCents,
                totalCents: g.subtotal + g.shippingCents + taxCents,
                items: { createMany: { data: g.items } }
            }
        });
        createdOrders.push(order);
    }

    if (discount) {
        await prisma.discountCode.update({ where: { id: discount.id }, data: { usedCount: { increment: 1 } } });
    }

    res.json({
        clientSecret: pi.client_secret,
        orderId: createdOrders[0].id,
        orderGroupId,
        taxCents: taxQuote.totalTaxCents,
        shippingCents: shippingCentsTotal,
        shippingEstimated: shippingQuote?.estimated ?? null,
        orders: createdOrders.map(o => ({ id: o.id, shopId: o.shopId, totalCents: o.totalCents }))
    });
});

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Called by Stripe (raw body required — registered with express.raw() in index.ts).
// Marks every order tied to this PaymentIntent PAID and sends confirmation emails.
export async function stripeWebhookHandler(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) return res.status(400).send('Missing stripe-signature header');

    let event: Stripe.Event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(
            req.body as Buffer,
            sig,
            config.stripe.webhookSecret
        );
    } catch (err: any) {
        console.error('[stripe-webhook] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as Stripe.PaymentIntent;

        const orders = await prisma.order.findMany({
            where: { stripePaymentIntentId: pi.id },
            include: { items: { include: { product: true } }, shop: true }
        });

        if (orders.length === 0) {
            console.warn(`[stripe-webhook] No order found for PI ${pi.id}`);
            return res.json({ received: true });
        }

        // Finalize the Stripe Tax calculation into a Transaction — this is what
        // makes the collected tax show up in Stripe's Tax reporting/filing tools.
        // One calculation covered the whole cart (possibly multiple shops/orders),
        // so this runs once per PaymentIntent, guarded by stripeTaxTransactionId
        // being unset on the pre-update order rows (idempotent across webhook
        // retries). Best-effort: the tax was already collected from the customer
        // regardless of whether this bookkeeping step succeeds.
        const first = orders[0];
        if (first.stripeTaxCalculationId && !first.stripeTaxTransactionId) {
            try {
                const stripe = getStripe();
                const tx = await stripe.tax.transactions.createFromCalculation({
                    calculation: first.stripeTaxCalculationId,
                    reference: first.orderGroupId ?? first.id
                });
                await prisma.order.updateMany({
                    where: { id: { in: orders.map(o => o.id) } },
                    data: { stripeTaxTransactionId: tx.id }
                });
            } catch (err: any) {
                console.error('[stripe-webhook] failed to record Stripe Tax transaction (tax was still collected from the customer — this only affects Stripe\'s own filing records):', err.message);
            }
        }

        for (const order of orders) {
            if (order.paymentStatus === 'PAID') continue;

            await prisma.order.update({
                where: { id: order.id },
                data: { paymentStatus: 'PAID' }
            });

            // Vendor blanks are ordered manually and in bulk via Order Report →
            // Place Order (which ships to the business, not the customer) — no
            // automatic per-order vendor submission here by design.

            // Recover abandoned checkout if any
            if (order.shopId) {
                await prisma.checkout.updateMany({
                    where: { shopId: order.shopId, email: order.customerEmail, status: 'ABANDONED' },
                    data: { status: 'RECOVERED' }
                });
            }

            // Send confirmation emails (fire-and-forget)
            sendOrderConfirmation({
                orderId: order.id,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                totalCents: order.totalCents,
                shippingCents: order.shippingCents,
                taxCents: order.taxCents,
                shopName: order.shop?.name,
                specialInstructions: order.specialInstructions,
                items: order.items.map(i => ({
                    name: i.product.name,
                    quantity: i.quantity,
                    size: i.size,
                    color: i.color,
                    priceCents: i.priceCents
                }))
            }).catch(err => console.error('[stripe-webhook] email error:', err));
        }
    }

    res.json({ received: true });
}
