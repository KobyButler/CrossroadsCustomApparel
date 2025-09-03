import { Router } from 'express';
import { prisma } from '../prisma.js';

export const router = Router();

router.get('/', async (_req, res) => {
    res.json(await prisma.discountCode.findMany());
});

router.post('/', async (req, res) => {
    const { code, type, value, active = true, expiresAt, maxUses } = req.body;
    const d = await prisma.discountCode.create({
        data: { code, type, value, active, expiresAt: expiresAt ? new Date(expiresAt) : null, maxUses }
    });
    res.json(d);
});
