import { Router } from 'express';
import { prisma } from '../prisma.js';
import { triggerVendorFulfillment } from '../vendors/fulfill.js';

export const router = Router();

// list; optional ?status=UNFULFILLED and ?groupBy=collection
router.get('/', async (req, res) => {
    const status = (req.query.status as string) ?? undefined;
    const orders = await prisma.order.findMany({
        where: status ? { status } : undefined,
        include: { items: { include: { product: { include: { collection: true } } } }, shop: true }
    });

    if (req.query.groupBy === 'collection') {
        const grouped: Record<string, any[]> = {};
        for (const o of orders) {
            const set: Set<string> = new Set(o.items.map(i => i.product.collection.name));
            for (const cName of set) {
                if (!grouped[cName]) grouped[cName] = [];
                grouped[cName].push(o);
            }
        }
        return res.json(grouped);
    }

    res.json(orders);
});

// create order (public checkout posts here)
router.post('/', async (req, res) => {
    const {
        shopSlug, customerName, customerEmail,
        shipAddress1, shipAddress2, shipCity, shipState, shipZip, residential = true,
        items, discountCode
    } = req.body;

    const shop = shopSlug ? await prisma.shop.findFirst({ where: { slug: shopSlug } }) : null;

    const products = await prisma.product.findMany({
        where: { id: { in: items.map((i: any) => i.productId) } }
    });
    if (products.length !== items.length) return res.status(400).json({ error: 'invalid product(s)' });

    let subtotal = 0;
    const orderItems = items.map((i: any) => {
        const p = products.find(pp => pp.id === i.productId)!;
        const price = p.priceCents;
        subtotal += price * i.quantity;
        return { productId: p.id, quantity: i.quantity, size: i.size ?? null, color: i.color ?? null, priceCents: price };
    });

    let discountId: string | undefined;
    if (discountCode) {
        const d = await prisma.discountCode.findFirst({
            where: { code: discountCode, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
        });
        if (d) {
            if (d.type === 'PERCENT') subtotal = Math.max(0, Math.round(subtotal * (100 - d.value) / 100));
            else subtotal = Math.max(0, subtotal - d.value);
            discountId = d.id;
        }
    }

    // upsert customer
    const customer = await prisma.customer.upsert({
        where: { email: customerEmail },
        update: { name: customerName },
        create: { email: customerEmail, name: customerName }
    });

    const order = await prisma.order.create({
        data: {
            shopId: shop?.id, status: 'UNFULFILLED',
            customerId: customer.id,
            customerName, customerEmail, shipAddress1, shipAddress2, shipCity, shipState, shipZip, residential,
            totalCents: subtotal, items: { createMany: { data: orderItems } }, discountCodeId: discountId
        },
        include: { items: { include: { product: true } } }
    });

    // mark related checkout (if any) recovered
    await prisma.checkout.updateMany({
        where: { shopId: shop?.id, email: customerEmail, status: 'ABANDONED' },
        data: { status: 'RECOVERED' }
    });

    triggerVendorFulfillment(order).catch(err => console.error('fulfillment error', err));
    res.json(order);
});

router.post('/:id/fulfill', async (req, res) => {
    const o = await prisma.order.update({ where: { id: req.params.id }, data: { status: 'FULFILLED' } });
    res.json(o);
});

// CSV of shipping addresses for label tools
router.get('/shipping/export', async (req, res) => {
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
