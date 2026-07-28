import { Router } from 'express';
import { prisma } from '../prisma.js';
import { triggerVendorFulfillment } from '../vendors/fulfill.js';
import { requireAuth } from '../middleware/auth.js';
import { sendOrderConfirmation, sendOfflinePaymentNotification } from '../utils/email.js';
import { computeItemPriceCents } from '../utils/pricing.js';
import { buildShopGroups, applyDiscountAcrossGroups, newOrderGroupId } from '../utils/checkoutHelpers.js';

export const router = Router();

// list; optional ?status=UNFULFILLED, ?shopId=xxx, ?groupBy=shop, ?limit=N, ?page=1 (admin only)
router.get('/', requireAuth, async (req, res) => {
    const status = (req.query.status as string) ?? undefined;
    const shopId = (req.query.shopId as string) ?? undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const page = req.query.page ? Math.max(1, parseInt(req.query.page as string, 10)) : 1;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (shopId) where.shopId = shopId;

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: { items: { include: { product: true } }, shop: true, vendorOrders: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip
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
        items, discountCode,
        paymentMethod   // 'pickup' | 'cash' | 'check'  (card goes through /payments/create-intent)
    } = req.body;

    const shop = shopSlug ? await prisma.shop.findFirst({ where: { slug: shopSlug } }) : null;

    const uniqueProductIds = [...new Set<string>(items.map((i: any) => i.productId))];
    const products = await prisma.product.findMany({
        where: { id: { in: uniqueProductIds } }
    });
    if (products.length !== uniqueProductIds.length) return res.status(400).json({ error: 'invalid product(s)' });

    let subtotal = 0;
    const orderItems = items.map((i: any) => {
        const p = products.find(pp => pp.id === i.productId)!;
        const price = computeItemPriceCents(p, i.size);
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
        customerName, customerEmail,
        shipAddress1, shipAddress2, shipCity, shipState, shipZip, residential = true,
        items, discountCode, paymentMethod
    } = req.body;

    if (!customerEmail || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'customerEmail and items are required' });
    }
    const isOffline = paymentMethod === 'pickup' || paymentMethod === 'cash' || paymentMethod === 'check';
    if (!isOffline) return res.status(400).json({ error: 'paymentMethod must be pickup, cash, or check' });

    let groups;
    try {
        groups = await buildShopGroups(items);
    } catch (err: any) {
        return res.status(400).json({ error: err.message });
    }

    const discount = await resolveDiscount(discountCode);
    const { groups: finalGroups, discountedTotal } = applyDiscountAcrossGroups(groups, discount);

    const customer = await prisma.customer.upsert({
        where: { email: customerEmail },
        update: { name: customerName },
        create: { email: customerEmail, name: customerName }
    });

    const orderGroupId = finalGroups.length > 1 ? newOrderGroupId() : null;
    const createdOrders = [];

    for (const g of finalGroups) {
        const order = await prisma.order.create({
            data: {
                shopId: g.shopId, orderGroupId,
                status: 'UNFULFILLED', paymentStatus: 'OFFLINE_PENDING', paymentMethod: 'pickup',
                customerId: customer.id, customerName, customerEmail,
                shipAddress1, shipAddress2: shipAddress2 ?? null, shipCity, shipState, shipZip, residential,
                totalCents: g.subtotal,
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
            shopName: g.shopName ?? undefined,
            paymentMethod: 'cash',
            items: order.items.map(i => ({ name: i.product.name, quantity: i.quantity, size: i.size, color: i.color, priceCents: i.priceCents }))
        }).catch(err => console.error('offline payment email error', err));
    }

    if (discount) {
        await prisma.discountCode.update({ where: { id: discount.id }, data: { usedCount: { increment: 1 } } });
    }

    res.json({
        orderGroupId,
        totalCents: discountedTotal,
        orders: createdOrders.map(o => ({ id: o.id, shopId: o.shopId, totalCents: o.totalCents }))
    });
});

router.post('/:id/fulfill', requireAuth, async (req, res) => {
    const o = await prisma.order.update({
        where: { id: String(req.params.id) },
        data: { status: 'FULFILLED' },
        include: { items: { include: { product: true } } },
    });
    triggerVendorFulfillment(o).catch(err => console.error('[fulfill] vendor error:', err));
    res.json(o);
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
    const existing = await prisma.order.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'order not found' });
    if (existing.status === 'FULFILLED') return res.status(400).json({ error: 'cannot cancel a fulfilled order' });
    const o = await prisma.order.update({ where: { id: String(req.params.id) }, data: { status: 'CANCELLED' } });
    res.json(o);
});

// CSV of shipping addresses for label tools (admin only)
router.get('/shipping/export', requireAuth, async (req, res) => {
    const status = (req.query.status as string) ?? 'UNFULFILLED';
    const orders = await prisma.order.findMany({ where: { status } });
    const rows = [
        ['OrderId', 'Name', 'Address1', 'Address2', 'City', 'State', 'Zip', 'Residential', 'Email'].join(','),
        ...orders.map(o => [
            o.id, q(o.customerName), q(o.shipAddress1), q(o.shipAddress2 ?? ''), q(o.shipCity),
            q(o.shipState), q(o.shipZip), o.residential ? 'Y' : 'N', q(o.customerEmail)
        ].join(','))
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="shipping_${status.toLowerCase()}.csv"`);
    res.send(rows.join('\n'));

    function q(s: string) { return `"${String(s).replaceAll('"', '""')}"`; }
});
