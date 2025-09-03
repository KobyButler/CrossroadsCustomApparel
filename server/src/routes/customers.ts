import { Router } from 'express';
import { prisma } from '../prisma.js';

export const router = Router();

router.get('/', async (_req, res) => {
    const customers = await prisma.customer.findMany({
        include: { orders: true },
        orderBy: { createdAt: 'desc' }
    });
    const data = customers.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        orders: c.orders.length,
        totalCents: c.orders.reduce((a, b) => a + b.totalCents, 0),
        createdAt: c.createdAt
    }));
    res.json(data);
});
