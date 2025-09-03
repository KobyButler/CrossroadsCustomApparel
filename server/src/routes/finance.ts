import { Router } from 'express';
import { prisma } from '../prisma.js';

export const router = Router();

router.get('/summary', async (_req, res) => {
    const [orders, txs] = await Promise.all([
        prisma.order.findMany({ where: { status: { in: ['UNFULFILLED', 'FULFILLED'] } } }),
        prisma.financeTransaction.findMany()
    ]);
    const gross = orders.reduce((a: number, b: typeof orders[0]) => a + b.totalCents, 0);
    const net = gross + txs.reduce((a: number, b: typeof txs[0]) => a + b.amountCents, 0);
    res.json({ grossCents: gross, netCents: net, orders: orders.length });
});
