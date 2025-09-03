import { Router } from 'express';
import { prisma } from '../prisma.js';

export const router = Router();

// list ?status=ABANDONED
router.get('/', async (req, res) => {
    const status = (req.query.status as string) ?? 'ABANDONED';
    const rows = await prisma.checkout.findMany({
        where: { status },
        include: { shop: true },
        orderBy: { updatedAt: 'desc' }
    });
    res.json(rows);
});

// save/update from shop page
router.post('/', async (req, res) => {
    const { shopSlug, email, items } = req.body;
    const shop = shopSlug ? await prisma.shop.findFirst({ where: { slug: shopSlug } }) : null;
    const cartJson = JSON.stringify(items ?? []);
    const row = await prisma.checkout.create({
        data: { shopId: shop?.id ?? null, email: email ?? null, cartJson, status: 'ABANDONED' }
    });
    res.json(row);
});
