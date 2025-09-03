import { Router } from 'express';
import { prisma } from '../prisma.js';

export const router = Router();

router.get('/', async (_req, res) => {
    const data = await prisma.product.findMany();
    res.json(data);
});

router.post('/', async (req, res) => {
    const { name, sku, vendor, vendorIdentifier, brand, description, priceCents, images, collectionId } = req.body;
    const p = await prisma.product.create({
        data: {
            name, sku, vendor, vendorIdentifier, brand, description,
            priceCents, imagesJson: JSON.stringify(images ?? []), collectionId
        }
    });
    res.json(p);
});

router.get('/:id', async (req, res) => {
    const p = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
});
