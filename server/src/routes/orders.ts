import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, AuthUser } from '../middleware/auth.js';
import { sendOrderConfirmation, sendOfflinePaymentNotification } from '../utils/email.js';
import { computeItemPriceCents, resolveProductPriceCents } from '../utils/pricing.js';
import { buildShopGroups, applyDiscountAcrossGroups, allocateShippingAcrossGroups, newOrderGroupId, assertShippingAllowed, assertShopsAvailable } from '../utils/checkoutHelpers.js';
import { quoteShipping, buyLabelForOrder } from '../utils/shippingCalc.js';
import { diffScalarFields, diffItems, recordOrderHistory } from '../utils/orderHistory.js';
import { quoteOrderTax } from '../utils/tax.js';
import { getStripeOrNull } from '../utils/stripeClient.js';

export const router = Router();

// list; optional ?status=UNFULFILLED, ?shopId=xxx, ?ids=a,b,c, ?groupBy=shop, ?limit=N, ?page=1 (admin only)
// ?ids fetches a specific set of orders by id (e.g. for "print these exact orders")
// — pagination doesn't apply in that mode, every matching id is returned.
router.get('/', requireAuth, async (req, res) => {
    const status = (req.query.status as string) ?? undefined;
    const shopId = (req.query.shopId as string) ?? undefined;
    const ids = req.query.ids ? String(req.query.ids).split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const page = req.query.page ? Math.max(1, parseInt(req.query.page as string, 10)) : 1;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (shopId) where.shopId = shopId;
    if (ids) where.id = { in: ids };

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: { items: { include: { product: true } }, shop: true, vendorOrders: true },
            orderBy: { createdAt: 'desc' },
            ...(ids ? {} : { take: limit, skip })
        }),
        prisma.order.count({ where })
    ]);

    if (req.query.groupBy === 'shop') {
        const grouped: Record<string, any[]> = {};
        for (const o of orders) {
            const name = o.shop?.name ?? 'No Shop';
            if (!grouped[name]) grouped[name] = [];
            grouped[name].push(o);
        }
        return res.json(grouped);
    }

    res.json({ data: orders, total, page, limit, pages: Math.ceil(total / limit) });
});

async function resolveDiscount(discountCode?: string) {
    if (!discountCode) return null;
    const d = await prisma.discountCode.findFirst({
        where: { code: discountCode, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
    });
    if (d && (d.maxUses === null || d.usedCount < d.maxUses)) return d;
    return null;
}

// create order (single-shop / no-shop) — used by the admin "Create Order" and
// "Draft Order" modals, and kept as a simple fallback for single-shop checkouts.
// Public checkout with a cross-shop cart should use POST /checkout instead.
router.post('/', async (req, res) => {
    const {
        shopSlug, customerName, customerEmail,
        shipAddress1, shipAddress2, shipCity, shipState, shipZip, residential = true,
        items, discountCode, specialInstructions,
        paymentMethod   // 'pickup' | 'cash' | 'check'  (card goes through /payments/create-intent)
    } = req.body;

    const shop = shopSlug ? await prisma.shop.findFirst({ where: { slug: shopSlug } }) : null;

    const uniqueProductIds = [...new Set<string>(items.map((i: any) => i.productId))];
    const products = await prisma.product.findMany({
        where: { id: { in: uniqueProductIds } },
        include: { adultProduct: { select: { priceCents: true, youthPriceCents: true } } }
    });
    if (products.length !== uniqueProductIds.length) return res.status(400).json({ error: 'invalid product(s)' });

    let subtotal = 0;
    const orderItems = items.map((i: any) => {
        const p = products.find(pp => pp.id === i.productId)!;
        const price = computeItemPriceCents({ ...p, priceCents: resolveProductPriceCents(p) }, i.size);
        subtotal += price * i.quantity;
        return { productId: p.id, quantity: i.quantity, size: i.size ?? null, color: i.color ?? null, priceCents: price };
    });

    const discount = await resolveDiscount(discountCode);
    let discountId: string | undefined;
    if (discount) {
        subtotal = discount.type === 'PERCENT'
            ? Math.max(0, Math.round(subtotal * (100 - discount.value) / 100))
            : Math.max(0, subtotal - discount.value);
        discountId = discount.id;
    }

    // upsert customer
    const customer = customerEmail ? await prisma.customer.upsert({
        where: { email: customerEmail },
        update: { name: customerName },
        create: { email: customerEmail, name: customerName }
    }) : null;

    const isOffline = paymentMethod === 'pickup' || paymentMethod === 'cash' || paymentMethod === 'check';
    const payStatus = isOffline ? 'OFFLINE_PENDING' : 'UNPAID';

    const order = await prisma.order.create({
        data: {
            shopId: shop?.id, status: 'UNFULFILLED',
            paymentStatus: payStatus,
            paymentMethod: isOffline ? 'pickup' : null,
            customerId: customer?.id,
            customerName, customerEmail, shipAddress1, shipAddress2, shipCity, shipState, shipZip, residential,
            specialInstructions: specialInstructions || null,
            totalCents: subtotal, items: { createMany: { data: orderItems } }, discountCodeId: discountId
        },
        include: { items: { include: { product: true } } }
    });

    if (discountId) {
        await prisma.discountCode.update({ where: { id: discountId }, data: { usedCount: { increment: 1 } } });
    }

    // mark related checkout (if any) recovered
    if (shop?.id && customerEmail) {
        await prisma.checkout.updateMany({
            where: { shopId: shop.id, email: customerEmail, status: 'ABANDONED' },
            data: { status: 'RECOVERED' }
        });
    }

    if (customerEmail) {
        const emailItems = order.items.map(i => ({
            name: i.product.name, quantity: i.quantity,
            size: i.size, color: i.color, priceCents: i.priceCents
        }));

        if (isOffline) {
            sendOfflinePaymentNotification({
                orderId: order.id,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                totalCents: order.totalCents,
                shopName: shop?.name,
                specialInstructions: order.specialInstructions,
                paymentMethod: 'cash',
                items: emailItems
            }).catch(err => console.error('offline payment email error', err));
        } else {
            sendOrderConfirmation({
                orderId: order.id,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                totalCents: order.totalCents,
                shopName: shop?.name,
                specialInstructions: order.specialInstructions,
                items: emailItems
            }).catch(err => console.error('email error', err));
        }
    }

    res.json(order);
});

// create orders for a cross-shop cart — public checkout endpoint used by the
// unified /checkout page. Splits items by the shop each was added from and
// creates one Order per shop, all sharing an orderGroupId. Offline payment
// methods only (card payments go through POST /payments/create-intent).
router.post('/checkout', async (req, res) => {
    const {
        customerName, customerEmail, shippingMethod,
        shipAddress1, shipAddress2, shipCity, shipState, shipZip, residential = true,
        items, discountCode, paymentMethod, specialInstructions
    } = req.body;

    if (!customerEmail || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'customerEmail and items are required' });
    }
    const isOffline = paymentMethod === 'pickup' || paymentMethod === 'cash' || paymentMethod === 'check';
    if (!isOffline) return res.status(400).json({ error: 'paymentMethod must be pickup, cash, or check' });

    const isShipping = shippingMethod === 'SHIP';
    if (isShipping && (!shipAddress1 || !shipCity || !shipState || !shipZip)) {
        return res.status(400).json({ error: 'A full shipping address is required to ship your order' });
    }

    let groups;
    try {
        groups = await buildShopGroups(items);
        assertShopsAvailable(groups);
        if (isShipping) assertShippingAllowed(groups);
    } catch (err: any) {
        return res.status(400).json({ error: err.message });
    }

    const discount = await resolveDiscount(discountCode);
    const { groups: discountedGroups, discountedTotal } = applyDiscountAcrossGroups(groups, discount);

    // Shipping is calculated once for the whole checkout (it all ships together)
    // and re-derived server-side — never trust a client-supplied shipping cost.
    const shippingQuote = isShipping
        ? await quoteShipping(items.map((i: any) => ({ productId: i.productId, quantity: i.quantity })), { city: shipCity, state: shipState, zip: shipZip, residential })
        : null;
    const shippingCentsTotal = shippingQuote?.cents ?? 0;
    const finalGroups = allocateShippingAcrossGroups(discountedGroups, shippingCentsTotal);

    // Sales tax is owed on this sale whether it's paid by card, cash, or check —
    // calculate it the same way the Stripe checkout does.
    const stripe = getStripeOrNull();
    const taxQuote = await quoteOrderTax(stripe, {
        groupSubtotals: finalGroups.map(g => g.subtotal),
        shippingCents: shippingCentsTotal,
        shippingMethod: isShipping ? 'SHIP' : 'PICKUP',
        shipAddress: isShipping ? { line1: shipAddress1, line2: shipAddress2, city: shipCity, state: shipState, zip: shipZip } : null
    });

    const customer = await prisma.customer.upsert({
        where: { email: customerEmail },
        update: { name: customerName },
        create: { email: customerEmail, name: customerName }
    });

    const orderGroupId = finalGroups.length > 1 ? newOrderGroupId() : null;
    const createdOrders = [];

    for (let idx = 0; idx < finalGroups.length; idx++) {
        const g = finalGroups[idx];
        const taxCents = taxQuote.taxCentsByGroup[idx] ?? 0;
        const orderTotal = g.subtotal + g.shippingCents + taxCents;
        const order = await prisma.order.create({
            data: {
                shopId: g.shopId, orderGroupId,
                status: 'UNFULFILLED', paymentStatus: 'OFFLINE_PENDING', paymentMethod: 'pickup',
                stripeTaxCalculationId: taxQuote.calculationId,
                customerId: customer.id, customerName, customerEmail,
                shippingMethod: isShipping ? 'SHIP' : 'PICKUP', shippingCents: g.shippingCents,
                shipAddress1: isShipping ? shipAddress1 : null, shipAddress2: isShipping ? (shipAddress2 ?? null) : null,
                shipCity: isShipping ? shipCity : null, shipState: isShipping ? shipState : null, shipZip: isShipping ? shipZip : null,
                residential,
                specialInstructions: specialInstructions || null,
                taxCents,
                totalCents: orderTotal,
                items: { createMany: { data: g.items } }
            },
            include: { items: { include: { product: true } } }
        });
        createdOrders.push(order);

        if (g.shopId) {
            await prisma.checkout.updateMany({
                where: { shopId: g.shopId, email: customerEmail, status: 'ABANDONED' },
                data: { status: 'RECOVERED' }
            });
        }

        sendOfflinePaymentNotification({
            orderId: order.id,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            totalCents: order.totalCents,
            shippingCents: order.shippingCents,
            taxCents: order.taxCents,
            shopName: g.shopName ?? undefined,
            specialInstructions: order.specialInstructions,
            paymentMethod: 'cash',
            items: order.items.map(i => ({ name: i.product.name, quantity: i.quantity, size: i.size, color: i.color, priceCents: i.priceCents }))
        }).catch(err => console.error('offline payment email error', err));
    }

    if (discount) {
        await prisma.discountCode.update({ where: { id: discount.id }, data: { usedCount: { increment: 1 } } });
    }

    // Sale is final the moment the order is placed (there's no later "payment
    // succeeded" event for cash/check the way there is for Stripe), so record
    // the Stripe Tax transaction for filing purposes right away. Best-effort —
    // the tax was already added to what the customer owes either way.
    if (stripe && taxQuote.calculationId) {
        try {
            const tx = await stripe.tax.transactions.createFromCalculation({
                calculation: taxQuote.calculationId,
                reference: orderGroupId ?? createdOrders[0].id
            });
            await prisma.order.updateMany({
                where: { id: { in: createdOrders.map(o => o.id) } },
                data: { stripeTaxTransactionId: tx.id }
            });
        } catch (err: any) {
            console.error('[checkout] failed to record Stripe Tax transaction (tax was still added to the order total the customer owes):', err.message);
        }
    }

    res.json({
        orderGroupId,
        totalCents: discountedTotal + shippingCentsTotal + taxQuote.totalTaxCents,
        shippingCents: shippingCentsTotal,
        shippingEstimated: shippingQuote?.estimated ?? null,
        taxCents: taxQuote.totalTaxCents,
        orders: createdOrders.map(o => ({ id: o.id, shopId: o.shopId, totalCents: o.totalCents }))
    });
});

router.post('/:id/fulfill', requireAuth, async (req, res) => {
    // Vendor blanks are ordered manually and in bulk via Order Report → Place
    // Order (which ships to the business, not the customer) — marking an order
    // fulfilled here does not trigger any automatic vendor submission.
    const id = String(req.params.id);
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'order not found' });

    const o = await prisma.order.update({
        where: { id },
        data: { status: 'FULFILLED' },
        include: { items: { include: { product: true } } },
    });

    if (existing.status !== 'FULFILLED') {
        const user = (req as any).user as AuthUser | undefined;
        await recordOrderHistory(id, user?.email, [{ field: 'status', label: 'Status', oldValue: existing.status, newValue: 'FULFILLED' }]);
    }
    res.json(o);
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'order not found' });
    if (existing.status === 'FULFILLED') return res.status(400).json({ error: 'cannot cancel a fulfilled order' });
    const o = await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });

    const user = (req as any).user as AuthUser | undefined;
    await recordOrderHistory(id, user?.email, [{ field: 'status', label: 'Status', oldValue: existing.status, newValue: 'CANCELLED' }]);
    res.json(o);
});

// Full order edit (admin only) — customer/shipping/payment/status fields plus
// line items (add/remove/modify). totalCents is always recomputed server-side
// from the submitted items + shippingCents + taxCents, never trusted from the
// client directly. shippingCents/taxCents themselves ARE trusted as given (not
// re-derived from Shippo/Stripe Tax) so an edit doesn't trigger a billed API
// call — same trade-off for both. Every field-level and item-level change is
// recorded to OrderHistoryEntry.
router.put('/:id', requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const existing = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, shop: true }
    });
    if (!existing) return res.status(404).json({ error: 'order not found' });

    const {
        customerName, customerEmail, shopId,
        status, paymentStatus, paymentMethod,
        shippingMethod, shippingCents, taxCents,
        shipAddress1, shipAddress2, shipCity, shipState, shipZip, residential,
        specialInstructions, items
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'At least one item is required' });
    }

    const uniqueProductIds = [...new Set<string>(items.map((i: any) => i.productId))];
    const products = await prisma.product.findMany({
        where: { id: { in: uniqueProductIds } },
        include: { adultProduct: { select: { priceCents: true, youthPriceCents: true } } }
    });
    if (products.length !== uniqueProductIds.length) return res.status(400).json({ error: 'invalid product(s)' });
    const productMap = new Map(products.map(p => [p.id, p]));

    const newItemsData = items.map((i: any) => {
        const p = productMap.get(i.productId)!;
        const priceCents = i.priceCents !== undefined && i.priceCents !== null && i.priceCents !== ''
            ? Math.round(Number(i.priceCents))
            : computeItemPriceCents({ ...p, priceCents: resolveProductPriceCents(p) }, i.size);
        return {
            id: i.id ? String(i.id) : undefined,
            productId: p.id, productName: p.name,
            size: i.size || null, color: i.color || null,
            quantity: Math.max(1, Math.round(Number(i.quantity) || 1)),
            priceCents
        };
    });
    const subtotal = newItemsData.reduce((a: number, i: { quantity: number; priceCents: number }) => a + i.quantity * i.priceCents, 0);

    const nextShippingCents = shippingCents !== undefined && shippingCents !== null && shippingCents !== ''
        ? Math.round(Number(shippingCents))
        : existing.shippingCents;
    // Not recalculated via Stripe Tax on every edit (that would mean a billed
    // API call on each save) — trusted from the client like shippingCents,
    // defaulting to whatever was already on the order.
    const nextTaxCents = taxCents !== undefined && taxCents !== null && taxCents !== ''
        ? Math.round(Number(taxCents))
        : existing.taxCents;
    const nextTotalCents = subtotal + nextShippingCents + nextTaxCents;

    // Resolve/validate shop reassignment
    const nextShopId = shopId !== undefined ? (shopId || null) : existing.shopId;
    let nextShop = existing.shop;
    if (nextShopId !== existing.shopId) {
        nextShop = nextShopId ? await prisma.shop.findUnique({ where: { id: nextShopId } }) : null;
        if (nextShopId && !nextShop) return res.status(400).json({ error: 'invalid shop' });
    }

    // Re-upsert the customer record if the email changed, so Customer stays in sync
    const nextCustomerEmail = customerEmail !== undefined ? customerEmail : existing.customerEmail;
    const nextCustomerName = customerName !== undefined ? customerName : existing.customerName;
    let nextCustomerId = existing.customerId;
    if (nextCustomerEmail && nextCustomerEmail !== existing.customerEmail) {
        const customer = await prisma.customer.upsert({
            where: { email: nextCustomerEmail },
            update: { name: nextCustomerName },
            create: { email: nextCustomerEmail, name: nextCustomerName }
        });
        nextCustomerId = customer.id;
    }

    const beforeScalar = {
        customerName: existing.customerName, customerEmail: existing.customerEmail,
        status: existing.status, paymentStatus: existing.paymentStatus, paymentMethod: existing.paymentMethod,
        shippingMethod: existing.shippingMethod, shippingCents: existing.shippingCents, taxCents: existing.taxCents,
        shipAddress1: existing.shipAddress1, shipAddress2: existing.shipAddress2,
        shipCity: existing.shipCity, shipState: existing.shipState, shipZip: existing.shipZip,
        residential: existing.residential, specialInstructions: existing.specialInstructions,
        totalCents: existing.totalCents,
    };
    const afterScalar = {
        customerName: nextCustomerName, customerEmail: nextCustomerEmail,
        status: status ?? existing.status,
        paymentStatus: paymentStatus ?? existing.paymentStatus,
        paymentMethod: paymentMethod !== undefined ? (paymentMethod || null) : existing.paymentMethod,
        shippingMethod: shippingMethod ?? existing.shippingMethod,
        shippingCents: nextShippingCents, taxCents: nextTaxCents,
        shipAddress1: shipAddress1 !== undefined ? (shipAddress1 || null) : existing.shipAddress1,
        shipAddress2: shipAddress2 !== undefined ? (shipAddress2 || null) : existing.shipAddress2,
        shipCity: shipCity !== undefined ? (shipCity || null) : existing.shipCity,
        shipState: shipState !== undefined ? (shipState || null) : existing.shipState,
        shipZip: shipZip !== undefined ? (shipZip || null) : existing.shipZip,
        residential: residential !== undefined ? Boolean(residential) : existing.residential,
        specialInstructions: specialInstructions !== undefined ? (specialInstructions || null) : existing.specialInstructions,
        totalCents: nextTotalCents,
    };

    const changes = diffScalarFields(beforeScalar, afterScalar);
    if (nextShopId !== existing.shopId) {
        changes.push({ field: 'shopId', label: 'Shop', oldValue: existing.shop?.name ?? null, newValue: nextShop?.name ?? null });
    }
    const oldItemsForDiff = existing.items.map(i => ({
        id: i.id, productId: i.productId, productName: i.product.name,
        size: i.size, color: i.color, quantity: i.quantity, priceCents: i.priceCents
    }));
    changes.push(...diffItems(oldItemsForDiff, newItemsData));

    const keepIds = new Set(newItemsData.filter((i: { id?: string }) => i.id).map((i: { id?: string }) => i.id));
    const toDeleteIds = existing.items.filter(i => !keepIds.has(i.id)).map(i => i.id);

    const updated = await prisma.$transaction(async (tx) => {
        if (toDeleteIds.length) await tx.orderItem.deleteMany({ where: { id: { in: toDeleteIds } } });
        for (const i of newItemsData) {
            if (i.id) {
                await tx.orderItem.update({
                    where: { id: i.id },
                    data: { productId: i.productId, size: i.size, color: i.color, quantity: i.quantity, priceCents: i.priceCents }
                });
            } else {
                await tx.orderItem.create({
                    data: { orderId: id, productId: i.productId, size: i.size, color: i.color, quantity: i.quantity, priceCents: i.priceCents }
                });
            }
        }
        return tx.order.update({
            where: { id },
            data: {
                customerName: afterScalar.customerName, customerEmail: afterScalar.customerEmail, customerId: nextCustomerId,
                shopId: nextShopId,
                status: afterScalar.status, paymentStatus: afterScalar.paymentStatus, paymentMethod: afterScalar.paymentMethod,
                shippingMethod: afterScalar.shippingMethod, shippingCents: afterScalar.shippingCents, taxCents: afterScalar.taxCents,
                shipAddress1: afterScalar.shipAddress1, shipAddress2: afterScalar.shipAddress2,
                shipCity: afterScalar.shipCity, shipState: afterScalar.shipState, shipZip: afterScalar.shipZip,
                residential: afterScalar.residential, specialInstructions: afterScalar.specialInstructions,
                totalCents: afterScalar.totalCents,
            },
            include: { items: { include: { product: true } }, shop: true, vendorOrders: true }
        });
    });

    const user = (req as any).user as AuthUser | undefined;
    await recordOrderHistory(id, user?.email, changes);

    res.json(updated);
});

// Change history for an order — most recent first (admin only)
router.get('/:id/history', requireAuth, async (req, res) => {
    const entries = await prisma.orderHistoryEntry.findMany({
        where: { orderId: String(req.params.id) },
        orderBy: { createdAt: 'desc' }
    });
    res.json(entries.map(e => ({
        id: e.id, userEmail: e.userEmail, createdAt: e.createdAt,
        changes: JSON.parse(e.changesJson)
    })));
});

// Buy a real, print-ready shipping label via Shippo (admin only). Idempotent
// by default — if this order already has a label, returns it as-is rather
// than buying (and paying for) a second one; pass ?regenerate=true to force
// a fresh purchase (e.g. the address was wrong and has since been corrected).
// The old label/tracking number, if any, is simply overwritten — Shippo does
// not auto-refund it, so regenerate only after the original really is unusable.
router.post('/:id/shipping-label', requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const regenerate = req.query.regenerate === 'true';
    const existing = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return res.status(404).json({ error: 'order not found' });
    if (existing.shippingMethod !== 'SHIP') return res.status(400).json({ error: 'this order is set to pickup, not shipping' });

    if (existing.shippingLabelUrl && !regenerate) {
        return res.json(existing);
    }

    try {
        const label = await buyLabelForOrder({
            items: existing.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            customerName: existing.customerName, customerEmail: existing.customerEmail,
            shipAddress1: existing.shipAddress1, shipAddress2: existing.shipAddress2,
            shipCity: existing.shipCity, shipState: existing.shipState, shipZip: existing.shipZip,
            residential: existing.residential
        });

        const o = await prisma.order.update({
            where: { id },
            data: {
                shippingLabelUrl: label.labelUrl,
                shippingLabelPurchasedAt: new Date(),
                shippingTrackingNumber: label.trackingNumber,
                shippingCarrier: label.carrier,
                shippingService: label.service,
                shippingTransactionId: label.transactionId
            },
            include: { items: { include: { product: true } } }
        });

        const user = (req as any).user as AuthUser | undefined;
        await recordOrderHistory(id, user?.email, [{
            field: 'shippingLabel', label: 'Shipping label',
            oldValue: existing.shippingTrackingNumber ? `Tracking ${existing.shippingTrackingNumber}` : null,
            newValue: `${label.carrier} ${label.service} — tracking ${label.trackingNumber ?? label.transactionId}`
        }]);

        res.json(o);
    } catch (err: any) {
        res.status(502).json({ error: err.message ?? 'Failed to buy shipping label' });
    }
});

// CSV of shipping addresses for label tools (admin only)
router.get('/shipping/export', requireAuth, async (req, res) => {
    const status = (req.query.status as string) ?? 'UNFULFILLED';
    const orders = await prisma.order.findMany({ where: { status } });
    const rows = [
        ['OrderId', 'Name', 'Address1', 'Address2', 'City', 'State', 'Zip', 'Residential', 'Email'].join(','),
        ...orders.filter(o => o.shippingMethod === 'SHIP').map(o => [
            o.id, q(o.customerName), q(o.shipAddress1 ?? ''), q(o.shipAddress2 ?? ''), q(o.shipCity ?? ''),
            q(o.shipState ?? ''), q(o.shipZip ?? ''), o.residential ? 'Y' : 'N', q(o.customerEmail)
        ].join(','))
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="shipping_${status.toLowerCase()}.csv"`);
    res.send(rows.join('\n'));

    function q(s: string) { return `"${String(s).replaceAll('"', '""')}"`; }
});
