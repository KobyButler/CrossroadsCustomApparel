import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { sendOrderConfirmation } from '../utils/email.js';
import { buildShopGroups, applyDiscountAcrossGroups, allocateShippingAcrossGroups, newOrderGroupId, assertShippingAllowed } from '../utils/checkoutHelpers.js';
import { quoteShipping } from '../utils/shippingCalc.js';

export const router = Router();

function getStripe() {
    if (!config.stripe.secretKey) throw new Error('STRIPE_SECRET_KEY is not set');
    return new Stripe(config.stripe.secretKey);
}

async function resolveDiscount(discountCode?: string) {
    if (!discountCode) return null;
    const d = await prisma.discountCode.findFirst({
        where: { code: discountCode, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
    });
    if (d && (d.maxUses === null || d.usedCount < d.maxUses)) return d;
    return null;
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
    const grandTotal = discountedTotal + shippingCentsTotal;

    // Stripe requires a minimum of 50 cents
    if (grandTotal < 50) {
        return res.status(400).json({ error: 'Order total is too low for card payment (minimum $0.50)' });
    }

    const customer = await prisma.customer.upsert({
        where: { email: customerEmail },
        update: { name: customerName },
        create: { email: customerEmail, name: customerName }
    });

    const orderGroupId = finalGroups.length > 1 ? newOrderGroupId() : null;

    // Create the Stripe PaymentIntent first so every order can be stamped with its id
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.create({
        amount: grandTotal,
        currency: 'usd',
        metadata: { orderGroupId: orderGroupId ?? '' },
        automatic_payment_methods: { enabled: true }
    });

    const createdOrders = [];
    for (const g of finalGroups) {
        const order = await prisma.order.create({
            data: {
                shopId: g.shopId, orderGroupId,
                status: 'UNFULFILLED', paymentStatus: 'UNPAID', paymentMethod: 'stripe',
                stripePaymentIntentId: pi.id,
                customerId: customer.id, customerName, customerEmail,
                shippingMethod: isShipping ? 'SHIP' : 'PICKUP', shippingCents: g.shippingCents,
                shipAddress1: isShipping ? shipAddress1 : null, shipAddress2: isShipping ? (shipAddress2 ?? null) : null,
                shipCity: isShipping ? shipCity : null, shipState: isShipping ? shipState : null, shipZip: isShipping ? shipZip : null,
                residential,
                specialInstructions: specialInstructions || null,
                totalCents: g.subtotal + g.shippingCents,
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
