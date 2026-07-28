import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../prisma.js';

const uploadsDir = process.env.UPLOADS_DIR ?? path.join(__dirname, '../../../public/uploads');
const upload = multer({
    dest: uploadsDir,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter(_req, file, cb) {
        if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only jpeg/png/webp/gif images are allowed'));
    }
});

export const router = Router();

const shopSelect = { select: { id: true, name: true, slug: true } };

router.get('/', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const page = req.query.page ? Math.max(1, parseInt(req.query.page as string, 10)) : 1;
    const skip = (page - 1) * limit;

    // Omit pagination wrapper when limit is not specified (keeps backwards compat for small catalogs)
    if (!req.query.page && !req.query.limit) {
        const data = await prisma.product.findMany({
            include: { shops: shopSelect },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(data);
    }

    const [data, total] = await Promise.all([
        prisma.product.findMany({
            include: { shops: shopSelect },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip
        }),
        prisma.product.count()
    ]);
    res.json({ data, total, page, limit, pages: Math.ceil(total / limit) });
});

router.post('/', async (req, res) => {
    const {
        name, sku, vendor, vendorIdentifier, brand, description, priceCents, images, sizes, colors,
        shopIds, upchargeEnabled, upchargeCents, weightOz
    } = req.body;
    try {
        const p = await prisma.product.create({
            data: {
                name, sku, vendor, vendorIdentifier, brand, description,
                priceCents,
                imagesJson: JSON.stringify(images ?? []),
                sizesJson: sizes?.length ? JSON.stringify(sizes) : null,
                colorsJson: colors?.length ? JSON.stringify(colors) : null,
                upchargeEnabled: Boolean(upchargeEnabled),
                ...(upchargeCents !== undefined ? { upchargeCents } : {}),
                ...(weightOz !== undefined ? { weightOz: weightOz === null ? null : Number(weightOz) } : {}),
                ...(Array.isArray(shopIds) && shopIds.length
                    ? { shops: { connect: shopIds.map((id: string) => ({ id })) } }
                    : {})
            },
            include: { shops: shopSelect }
        });
        res.json(p);
    } catch (err: any) {
        if (err?.code === 'P2002') {
            return res.status(409).json({ error: `A product with SKU "${sku}" already exists.` });
        }
        throw err;
    }
});

router.get('/:id', async (req, res) => {
    const p = await prisma.product.findUnique({
        where: { id: req.params.id },
        include: { shops: shopSelect }
    });
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
});

router.put('/:id', async (req, res) => {
    const {
        name, sku, vendor, vendorIdentifier, brand, description, priceCents, sizes, colors,
        shopIds, upchargeEnabled, upchargeCents, weightOz
    } = req.body;
    try {
        const p = await prisma.product.update({
            where: { id: req.params.id },
            data: {
                name, sku, vendor,
                vendorIdentifier: vendorIdentifier ?? null,
                brand: brand ?? null,
                description: description ?? null,
                priceCents,
                sizesJson: sizes?.length ? JSON.stringify(sizes) : null,
                colorsJson: colors?.length ? JSON.stringify(colors) : null,
                ...(upchargeEnabled !== undefined ? { upchargeEnabled: Boolean(upchargeEnabled) } : {}),
                ...(upchargeCents !== undefined ? { upchargeCents } : {}),
                ...(weightOz !== undefined ? { weightOz: weightOz === null ? null : Number(weightOz) } : {}),
                ...(Array.isArray(shopIds)
                    ? { shops: { set: shopIds.map((id: string) => ({ id })) } }
                    : {})
            },
            include: { shops: shopSelect }
        });
        res.json(p);
    } catch (err: any) {
        if (err?.code === 'P2002') {
            return res.status(409).json({ error: `A product with that SKU already exists.` });
        }
        res.status(404).json({ error: 'not found' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id } });
        res.status(204).end();
    } catch {
        res.status(404).json({ error: 'not found' });
    }
});

// Duplicate a product — copies all fields (and shop assignments), appends "(1)",
// "(2)", … to the SKU until a free one is found.
router.post('/:id/duplicate', async (req, res) => {
    const source = await prisma.product.findUnique({
        where: { id: req.params.id },
        include: { shops: { select: { id: true } } }
    });
    if (!source) return res.status(404).json({ error: 'not found' });

    let n = 1;
    let newSku = `${source.sku} (${n})`;
    while (await prisma.product.findUnique({ where: { sku: newSku } })) {
        n += 1;
        newSku = `${source.sku} (${n})`;
    }

    const copy = await prisma.product.create({
        data: {
            name: source.name,
            sku: newSku,
            vendor: source.vendor,
            vendorIdentifier: source.vendorIdentifier,
            brand: source.brand,
            description: source.description,
            priceCents: source.priceCents,
            imagesJson: source.imagesJson,
            sizesJson: source.sizesJson,
            colorsJson: source.colorsJson,
            weightOz: source.weightOz,
            upchargeEnabled: source.upchargeEnabled,
            upchargeCents: source.upchargeCents,
            shops: source.shops.length ? { connect: source.shops.map(s => ({ id: s.id })) } : undefined
        },
        include: { shops: shopSelect }
    });
    res.json(copy);
});

// Upload an image for a product — returns the public URL
router.post('/:id/images', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${req.file.filename}${ext}`;
    const fs = await import('fs/promises');
    await fs.rename(req.file.path, path.join(path.dirname(req.file.path), filename));
    const url = `/uploads/${filename}`;

    // Append the URL to the product's imagesJson
    const product = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'not found' });
    const images: string[] = product.imagesJson ? JSON.parse(product.imagesJson) : [];
    images.push(url);
    const updated = await prisma.product.update({
        where: { id: String(req.params.id) },
        data: { imagesJson: JSON.stringify(images) }
    });
    res.json({ url, images, product: updated });
});

// Remove an image from a product. Body: { url }. If the image was one of ours
// (under /uploads/), also deletes the file from disk.
router.delete('/:id/images', async (req, res) => {
    const { url } = req.body as { url?: string };
    if (!url) return res.status(400).json({ error: 'url is required' });

    const product = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'not found' });

    const images: string[] = product.imagesJson ? JSON.parse(product.imagesJson) : [];
    const nextImages = images.filter(u => u !== url);

    const updated = await prisma.product.update({
        where: { id: String(req.params.id) },
        data: { imagesJson: JSON.stringify(nextImages) }
    });

    if (url.startsWith('/uploads/')) {
        const fs = await import('fs/promises');
        const filePath = path.join(uploadsDir, path.basename(url));
        await fs.unlink(filePath).catch(() => { /* file may already be gone */ });
    }

    res.json({ images: nextImages, product: updated });
});
