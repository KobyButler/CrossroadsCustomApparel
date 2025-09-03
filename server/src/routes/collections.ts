import { Router } from 'express';
import { prisma } from '../prisma.js';
import slugify from '../utils/slugify.js';

export const router = Router();

router.get('/', async (_req, res) => {
    const data = await prisma.collection.findMany({ include: { products: true } });
    res.json(data);
});

router.post('/', async (req, res) => {
    const { name, description } = req.body;
    const slug = slugify(name);
    const c = await prisma.collection.create({ data: { name, description, slug } });
    res.json(c);
});
