import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../prisma.js';

const uploadsDir = process.env.UPLOADS_DIR ?? path.join(__dirname, '../../../public/uploads');
const uploadImages = multer({
    dest: uploadsDir,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter(_req, file, cb) {
        if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only jpeg/png/webp/gif images are allowed'));
    }
});
const uploadPdf = multer({
    dest: uploadsDir,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
    fileFilter(_req, file, cb) {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'));
    }
});

export const router = Router();

const shopSelect = { select: { id: true, name: true, slug: true } };
// priceCents here is the youth product's own raw stored price (e.g. a SanMar
// import at wholesale cost) — shown in the admin UI only as reference next to
// the "Youth Size Pricing" override field; it is never what a customer is
// charged. See youthPriceCents on the adult product and resolveProductPriceCents.
const youthSelect = { select: { id: true, name: true, vendorIdentifier: true, sizeChartUrl: true, priceCents: true } };

// Writes a size chart URL onto a linked youth product (called after the adult
// product's own save succeeds). undefined means "not touched by this save" —
// only runs when the admin actually set/changed the youth size chart field.
async function syncYouthSizeChart(youthProductId: string | null | undefined, youthSizeChartUrl: string | undefined) {
    if (!youthProductId || youthSizeChartUrl === undefined) return;
    await prisma.product.update({ where: { id: youthProductId }, data: { sizeChartUrl: youthSizeChartUrl || null } })
        .catch(err => console.error('[products] failed to sync youth size chart (non-fatal):', err));
}

// Validates a proposed adult->youth product link before saving it. Returns a
// user-facing error string, or null if the link is fine. currentProductId is
// null on create (nothing to compare against yet) and the product's own id on
// update (so re-saving with the same link it already has isn't rejected).
async function validateYouthLink(youthProductId: string, currentProductId: string | null): Promise<string | null> {
    if (youthProductId === currentProductId) return "A product can't be linked to itself.";
    const target = await prisma.product.findUnique({ where: { id: youthProductId }, select: { id: true, name: true } });
    if (!target) return 'Selected youth product not found.';
    const claimedBy = await prisma.product.findFirst({
        where: { youthProductId, ...(currentProductId ? { id: { not: currentProductId } } : {}) },
        select: { id: true, name: true }
    });
    if (claimedBy) return `"${target.name}" is already linked as the youth version of "${claimedBy.name}".`;
    return null;
}

// Renames a multer temp file to include its original extension and returns the public URL.
async function finalizeUpload(file: Express.Multer.File, fallbackExt: string): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase() || fallbackExt;
    const filename = `${file.filename}${ext}`;
    const fs = await import('fs/promises');
    await fs.rename(file.path, path.join(path.dirname(file.path), filename));
    return `/uploads/${filename}`;
}

// Deletes any of our own /uploads/ files that are no longer referenced after an
// update (e.g. images removed from the array, or a size chart replaced). Best-effort.
async function cleanupRemovedFiles(oldUrls: (string | null | undefined)[], newUrls: (string | null | undefined)[]) {
    const fs = await import('fs/promises');
    const stillUsed = new Set(newUrls.filter(Boolean));
    const removed = [...new Set(oldUrls.filter((u): u is string => !!u && u.startsWith('/uploads/') && !stillUsed.has(u)))];
    await Promise.all(removed.map(u => fs.unlink(path.join(uploadsDir, path.basename(u))).catch(() => { /* already gone */ })));
}

router.get('/', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const page = req.query.page ? Math.max(1, parseInt(req.query.page as string, 10)) : 1;
    const skip = (page - 1) * limit;

    // Omit pagination wrapper when limit is not specified (keeps backwards compat for small catalogs)
    if (!req.query.page && !req.query.limit) {
        const data = await prisma.product.findMany({
            include: { shops: shopSelect, youthProduct: youthSelect },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(data);
    }

    const [data, total] = await Promise.all([
        prisma.product.findMany({
            include: { shops: shopSelect, youthProduct: youthSelect },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip
        }),
        prisma.product.count()
    ]);
    res.json({ data, total, page, limit, pages: Math.ceil(total / limit) });
});

// Upload one or more product images before a product exists (e.g. while filling
// out the "Add Product" form). Not tied to any product — returns the URLs so the
// caller can stage them in the images array and submit them with the product.
router.post('/images/upload', uploadImages.array('images', 20), async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) return res.status(400).json({ error: 'no files uploaded' });
    try {
        const urls = await Promise.all(files.map(f => finalizeUpload(f, '.jpg')));
        res.json({ urls });
    } catch (err: any) {
        res.status(500).json({ error: err.message ?? 'upload failed' });
    }
});

// Upload a size chart PDF before a product exists — same pattern as the images upload above.
router.post('/sizechart/upload', uploadPdf.single('sizechart'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
    try {
        const url = await finalizeUpload(req.file, '.pdf');
        res.json({ url });
    } catch (err: any) {
        res.status(500).json({ error: err.message ?? 'upload failed' });
    }
});

router.post('/', async (req, res) => {
    const {
        name, sku, vendor, vendorIdentifier, brand, description, priceCents, images, sizes, colors,
        shopIds, upchargeEnabled, upchargeCents, weightOz, sizeChartUrl, youthProductId, youthSizeChartUrl,
        youthPriceCents
    } = req.body;
    if (!Array.isArray(colors) || colors.length === 0) {
        return res.status(400).json({ error: 'At least one color is required.' });
    }
    if (youthProductId) {
        const err = await validateYouthLink(youthProductId, null);
        if (err) return res.status(400).json({ error: err });
    }
    try {
        const p = await prisma.product.create({
            data: {
                name, sku, vendor, vendorIdentifier, brand, description,
                priceCents,
                imagesJson: JSON.stringify(images ?? []),
                sizesJson: sizes?.length ? JSON.stringify(sizes) : null,
                colorsJson: colors?.length ? JSON.stringify(colors) : null,
                sizeChartUrl: sizeChartUrl || null,
                upchargeEnabled: Boolean(upchargeEnabled),
                ...(upchargeCents !== undefined ? { upchargeCents } : {}),
                ...(weightOz !== undefined ? { weightOz: weightOz === null ? null : Number(weightOz) } : {}),
                youthProductId: youthProductId || null,
                // null/omitted/blank = inherit this product's own priceCents for
                // the linked youth variant (the default); only a real number
                // means the admin deliberately set a different youth price.
                youthPriceCents: youthPriceCents === undefined || youthPriceCents === null || youthPriceCents === ''
                    ? null : Math.round(Number(youthPriceCents)),
                ...(Array.isArray(shopIds) && shopIds.length
                    ? { shops: { connect: shopIds.map((id: string) => ({ id })) } }
                    : {})
            },
            include: { shops: shopSelect, youthProduct: youthSelect }
        });
        await syncYouthSizeChart(p.youthProductId, youthSizeChartUrl);
        res.json(youthSizeChartUrl !== undefined && p.youthProductId
            ? await prisma.product.findUnique({ where: { id: p.id }, include: { shops: shopSelect, youthProduct: youthSelect } })
            : p);
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
        include: { shops: shopSelect, youthProduct: youthSelect }
    });
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
});

router.put('/:id', async (req, res) => {
    const {
        name, sku, vendor, vendorIdentifier, brand, description, priceCents, images, sizes, colors,
        shopIds, upchargeEnabled, upchargeCents, weightOz, sizeChartUrl, youthProductId, youthSizeChartUrl,
        youthPriceCents
    } = req.body;
    if (!Array.isArray(colors) || colors.length === 0) {
        return res.status(400).json({ error: 'At least one color is required.' });
    }
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'not found' });

    if (youthProductId !== undefined && youthProductId && youthProductId !== existing.youthProductId) {
        const linkErr = await validateYouthLink(youthProductId, req.params.id);
        if (linkErr) return res.status(400).json({ error: linkErr });
    }

    try {
        const p = await prisma.product.update({
            where: { id: req.params.id },
            data: {
                name, sku, vendor,
                vendorIdentifier: vendorIdentifier ?? null,
                brand: brand ?? null,
                description: description ?? null,
                priceCents,
                ...(Array.isArray(images) ? { imagesJson: JSON.stringify(images) } : {}),
                sizesJson: sizes?.length ? JSON.stringify(sizes) : null,
                colorsJson: colors?.length ? JSON.stringify(colors) : null,
                ...(sizeChartUrl !== undefined ? { sizeChartUrl: sizeChartUrl || null } : {}),
                ...(upchargeEnabled !== undefined ? { upchargeEnabled: Boolean(upchargeEnabled) } : {}),
                ...(upchargeCents !== undefined ? { upchargeCents } : {}),
                ...(weightOz !== undefined ? { weightOz: weightOz === null ? null : Number(weightOz) } : {}),
                ...(youthProductId !== undefined ? { youthProductId: youthProductId || null } : {}),
                ...(youthPriceCents !== undefined
                    ? { youthPriceCents: youthPriceCents === null || youthPriceCents === '' ? null : Math.round(Number(youthPriceCents)) }
                    : {}),
                ...(Array.isArray(shopIds)
                    ? { shops: { set: shopIds.map((id: string) => ({ id })) } }
                    : {})
            },
            include: { shops: shopSelect, youthProduct: youthSelect }
        });

        // Clean up any of our own uploaded files that are no longer referenced.
        if (Array.isArray(images)) {
            const oldImages: string[] = existing.imagesJson ? JSON.parse(existing.imagesJson) : [];
            await cleanupRemovedFiles(oldImages, images);
        }
        if (sizeChartUrl !== undefined && existing.sizeChartUrl && existing.sizeChartUrl !== sizeChartUrl) {
            await cleanupRemovedFiles([existing.sizeChartUrl], [sizeChartUrl]);
        }

        await syncYouthSizeChart(p.youthProductId, youthSizeChartUrl);
        res.json(youthSizeChartUrl !== undefined && p.youthProductId
            ? await prisma.product.findUnique({ where: { id: p.id }, include: { shops: shopSelect, youthProduct: youthSelect } })
            : p);
    } catch (err: any) {
        if (err?.code === 'P2002' && err?.meta?.target?.includes?.('youthProductId')) {
            return res.status(409).json({ error: 'That product is already linked as another product\'s youth version.' });
        }
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
            sizeChartUrl: source.sizeChartUrl,
            weightOz: source.weightOz,
            upchargeEnabled: source.upchargeEnabled,
            upchargeCents: source.upchargeCents,
            shops: source.shops.length ? { connect: source.shops.map(s => ({ id: s.id })) } : undefined
        },
        include: { shops: shopSelect }
    });
    res.json(copy);
});
