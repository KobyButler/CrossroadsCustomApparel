import { Router } from 'express';
import { prisma } from '../prisma.js';

export const router = Router();

router.get('/', async (_req, res) => res.json(await prisma.contentPage.findMany()));

router.post('/', async (req, res) => {
    const { slug, title, body } = req.body;
    const page = await prisma.contentPage.upsert({
        where: { slug },
        create: { slug, title, body },
        update: { title, body }
    });
    res.json(page);
});
