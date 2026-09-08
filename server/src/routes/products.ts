import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../prisma.js';
import { vendorStyleCode } from '../utils/vendorGrouping.js';
import { optionMatches, suggestClosestOption } from '../utils/vendorOptionMatch.js';
import { recordOrderHistory, FieldChange } from '../utils/orderHistory.js';
import { AuthUser } from '../middleware/auth.js';

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

// GET /products/vendor-drift — flags SanMar-linked products whose configured
// color/size no longer matches SanMar's own cataloged options for that style
// (SanMar renaming/re-coding a color on their end is what triggered this
// feature — see the order-placement error in sanmar.ts for the same
// underlying check, applied there per-line at order time instead of
// proactively across the whole catalog). Compares against the cached
// SanmarCatalogProduct table (kept fresh by the weekly sync + self-healing
// live lookups — see server/src/vendors/sanmar.ts) rather than calling
// SanMar live for every product, so this stays cheap enough to run on every
// Products page load. A style with zero cataloged rows (never synced, or a
// manually-entered product) is skipped entirely rather than flagged — no
// catalog to compare against means no evidence of drift, not evidence of a
// problem. Placed before the /:id route below so Express doesn't swallow
// this path as if "vendor-drift" were an id.
router.get('/vendor-drift', async (_req, res) => {
    const products = await prisma.product.findMany({
        where: { vendor: 'SANMAR', OR: [{ colorsJson: { not: null } }, { sizesJson: { not: null } }] },
        select: { id: true, name: true, sku: true, vendorIdentifier: true, colorsJson: true, sizesJson: true }
    });
    if (products.length === 0) return res.json({ data: [] });

    const withStyle = products.map(p => ({ ...p, style: vendorStyleCode(p) }));
    const styles = [...new Set(withStyle.map(p => p.style))];

    const catalogRows = await prisma.sanmarCatalogProduct.findMany({
        where: { style: { in: styles } },
        select: { style: true, colorName: true, sizeName: true }
    });
    const colorsByStyle = new Map<string, Set<string>>();
    const sizesByStyle = new Map<string, Set<string>>();
    for (const r of catalogRows) {
        if (r.colorName) (colorsByStyle.get(r.style) ?? colorsByStyle.set(r.style, new Set()).get(r.style)!).add(r.colorName);
        if (r.sizeName) (sizesByStyle.get(r.style) ?? sizesByStyle.set(r.style, new Set()).get(r.style)!).add(r.sizeName);
    }

    const flagged = withStyle.map(p => {
        const validColors = [...(colorsByStyle.get(p.style) ?? [])];
        const validSizes = [...(sizesByStyle.get(p.style) ?? [])];
        // Nothing cataloged for this style at all — no basis for comparison.
        if (validColors.length === 0 && validSizes.length === 0) return null;

        const colors: string[] = p.colorsJson ? JSON.parse(p.colorsJson) : [];
        const sizes: string[] = p.sizesJson ? JSON.parse(p.sizesJson) : [];
        const invalidColors = validColors.length
            ? colors.filter(c => !optionMatches(c, validColors)).map(value => ({ value, suggestion: suggestClosestOption(value, validColors) }))
            : [];
        const invalidSizes = validSizes.length
            ? sizes.filter(s => !optionMatches(s, validSizes)).map(value => ({ value, suggestion: suggestClosestOption(value, validSizes) }))
            : [];
        if (invalidColors.length === 0 && invalidSizes.length === 0) return null;

        return { productId: p.id, productName: p.name, sku: p.sku, style: p.style, invalidColors, invalidSizes };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    res.json({ data: flagged });
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

// One row of order-impact from a color/size an edit just removed — one
// per affected OrderItem-field, so an item that's stale on BOTH its color
// and size (rare, but possible) surfaces as two independently
// accept/reject-able rows rather than one row that conflates them.
type OrderImpactRow = {
    orderId: string; orderItemId: string; field: 'color' | 'size';
    oldValue: string; otherFieldLabel: string | null;
    suggestedValue: string | null; validOptions: string[];
    customerName: string; quantity: number; orderCreatedAt: string;
};

// Compares a product's old vs. new color/size lists, and — only for the
// values this edit actually removed — finds every UNFULFILLED order still
// carrying one of them, so the admin can reconcile those orders right in
// the same save flow rather than discovering the mismatch later (whether
// that's a customer complaint or a failed vendor PO like the one that
// prompted this feature). Fulfilled/cancelled orders are left alone
// entirely — they're historical record of what was actually sent, not
// something a later product edit should retroactively rewrite.
async function computeOrderImpact(
    productId: string, productName: string,
    oldColors: string[], oldSizes: string[], newColors: string[], newSizes: string[]
): Promise<{ productName: string; affected: OrderImpactRow[] } | null> {
    const removedColors = oldColors.filter(c => !optionMatches(c, newColors));
    const removedSizes = oldSizes.filter(s => !optionMatches(s, newSizes));
    if (removedColors.length === 0 && removedSizes.length === 0) return null;

    const orders = await prisma.order.findMany({
        where: {
            status: 'UNFULFILLED',
            items: {
                some: {
                    productId,
                    OR: [
                        ...(removedColors.length ? [{ color: { in: removedColors } }] : []),
                        ...(removedSizes.length ? [{ size: { in: removedSizes } }] : []),
                    ]
                }
            }
        },
        include: { items: { where: { productId } } }
    });

    const affected: OrderImpactRow[] = [];
    for (const o of orders) {
        for (const item of o.items) {
            if (item.color && removedColors.includes(item.color)) {
                affected.push({
                    orderId: o.id, orderItemId: item.id, field: 'color',
                    oldValue: item.color, otherFieldLabel: item.size ? `Size ${item.size}` : null,
                    suggestedValue: suggestClosestOption(item.color, newColors), validOptions: newColors,
                    customerName: o.customerName, quantity: item.quantity, orderCreatedAt: o.createdAt.toISOString()
                });
            }
            if (item.size && removedSizes.includes(item.size)) {
                affected.push({
                    orderId: o.id, orderItemId: item.id, field: 'size',
                    oldValue: item.size, otherFieldLabel: item.color ? `Color ${item.color}` : null,
                    suggestedValue: suggestClosestOption(item.size, newSizes), validOptions: newSizes,
                    customerName: o.customerName, quantity: item.quantity, orderCreatedAt: o.createdAt.toISOString()
                });
            }
        }
    }
    return affected.length > 0 ? { productName, affected } : null;
}

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
        const responseProduct = youthSizeChartUrl !== undefined && p.youthProductId
            ? await prisma.product.findUnique({ where: { id: p.id }, include: { shops: shopSelect, youthProduct: youthSelect } })
            : p;

        // A color/size this edit just removed might still be sitting on
        // unfulfilled customer orders (this is exactly how "SanMar renamed
        // Athletic Grey to Athletic Heather" turned into a failed PO days
        // later) — surface those right in the save response so the admin
        // can fix them immediately instead of discovering it at order time.
        const orderImpact = await computeOrderImpact(p.id, p.name,
            existing.colorsJson ? JSON.parse(existing.colorsJson) : [],
            existing.sizesJson ? JSON.parse(existing.sizesJson) : [],
            Array.isArray(colors) ? colors : [], Array.isArray(sizes) ? sizes : []);

        res.json({ ...responseProduct, orderImpact });
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

// POST /products/:id/reconcile-orders — applies admin-approved color/size
// corrections to specific order items, from the review screen a product
// save's orderImpact triggers. Never runs automatically: every change here
// was an explicit accept/edit + "Apply" click, never a value this endpoint
// picked on its own — see vendorOptionMatch.ts's suggestion-not-decision
// philosophy. Only touches the OrderItem rows named in `changes`; the
// product itself was already saved by the PUT above.
router.post('/:id/reconcile-orders', async (req, res) => {
    const { changes } = req.body as { changes?: { orderItemId: string; field: 'color' | 'size'; newValue: string }[] };
    if (!Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({ error: 'changes must be a non-empty array' });
    }

    const user = (req as any).user as AuthUser | undefined;
    const itemIds = [...new Set(changes.map(c => c.orderItemId))];
    const items = await prisma.orderItem.findMany({
        where: { id: { in: itemIds }, productId: req.params.id },
        include: { order: { select: { id: true, status: true } } }
    });
    const itemById = new Map(items.map(i => [i.id, i]));

    // Group by order so one order touched on two lines gets one history
    // entry describing both, not two separate entries a moment apart.
    const changesByOrder = new Map<string, FieldChange[]>();
    let applied = 0;

    for (const c of changes) {
        const item = itemById.get(c.orderItemId);
        if (!item) continue; // stale id (already reconciled, or belongs to a different product) — skip, don't error the whole batch
        // Never touch a fulfilled/cancelled order's record of what was
        // actually sent, even if the review screen was left open long
        // enough for its status to change underneath it.
        if (item.order.status !== 'UNFULFILLED') continue;
        if (c.field !== 'color' && c.field !== 'size') continue;

        const oldValue = c.field === 'color' ? item.color : item.size;
        if (oldValue === c.newValue) continue;

        await prisma.orderItem.update({ where: { id: item.id }, data: { [c.field]: c.newValue } });
        applied++;

        const label = c.field === 'color' ? 'Color corrected' : 'Size corrected';
        const list = changesByOrder.get(item.orderId) ?? [];
        list.push({ field: `item-${c.field}`, label: `${label} (product update)`, oldValue: oldValue ?? null, newValue: c.newValue });
        changesByOrder.set(item.orderId, list);
    }

    await Promise.all([...changesByOrder.entries()].map(([orderId, fieldChanges]) =>
        recordOrderHistory(orderId, user?.email, fieldChanges)
    ));

    res.json({ applied, ordersUpdated: changesByOrder.size });
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
