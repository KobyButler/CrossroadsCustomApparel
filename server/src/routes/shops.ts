import { Router } from 'express';
import { prisma } from '../prisma.js';
import slugify from '../utils/slugify.js';

export const router = Router();

router.get('/', async (_req, res) => {
    const data = await prisma.shop.findMany({ include: { collection: true } });
    res.json(data);
});

router.post('/', async (req, res) => {
    const { name, collectionId, expiresAt, notes } = req.body;
    const slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6);
    const s = await prisma.shop.create({
        data: { name, slug, collectionId, notes, expiresAt: expiresAt ? new Date(expiresAt) : null }
    });
    res.json(s);
});

router.get('/:slug', async (req, res) => {
    const s = await prisma.shop.findFirst({
        where: { slug: req.params.slug, active: true },
        include: { collection: { include: { products: true } } }
    });
    if (!s) return res.status(404).json({ error: 'not found' });
    res.json(s);
});
