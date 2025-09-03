import { Router } from 'express';
import { prisma } from '../prisma.js';

export const router = Router();

router.get('/overview', async (_req, res) => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const orders = await prisma.order.findMany({ where: { createdAt: { gte: since } } });
    const byDay = new Map<string, { count: number; cents: number }>();
    for (const o of orders) {
        const d = o.createdAt.toISOString().slice(0, 10);
        const cur = byDay.get(d) ?? { count: 0, cents: 0 };
        cur.count += 1; cur.cents += o.totalCents;
        byDay.set(d, cur);
    }
    const series = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, orders: v.count, grossCents: v.cents }));

    // top products
    const items = await prisma.orderItem.findMany({ include: { product: true } });
    const bySku = new Map<string, { name: string; qty: number; cents: number }>();
    for (const it of items) {
        const k = it.product.sku;
        const cur = bySku.get(k) ?? { name: it.product.name, qty: 0, cents: 0 };
        cur.qty += it.quantity; cur.cents += it.priceCents * it.quantity;
        bySku.set(k, cur);
    }
    const top = Array.from(bySku.entries())
        .map(([sku, v]) => ({ sku, name: v.name, qty: v.qty, salesCents: v.cents }))
        .sort((a, b) => b.salesCents - a.salesCents).slice(0, 10);

    res.json({ series, top });
});
