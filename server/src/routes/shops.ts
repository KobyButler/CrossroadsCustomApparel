import { Router } from 'express';
import { prisma } from '../prisma.js';
import slugify from '../utils/slugify.js';
import { requireAuth } from '../middleware/auth.js';

export const router = Router();

// List all shops (admin only)
router.get('/', requireAuth, async (_req, res) => {
    const data = await prisma.shop.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { createdAt: 'desc' }
    });
    res.json(data);
});

// Public directory of active, non-expired shops — powers the /shops landing page.
// Registered before the /:slug route below so "directory" is never treated as a slug.
router.get('/directory', async (_req, res) => {
    const now = new Date();
    const shops = await prisma.shop.findMany({
        where: { active: true, archived: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        include: { _count: { select: { products: true } } },
        orderBy: { createdAt: 'desc' }
    });
    res.json(shops.map(s => ({
        id: s.id, name: s.name, slug: s.slug, notes: s.notes, expiresAt: s.expiresAt,
        shippingEnabled: s.shippingEnabled,
        productCount: s._count.products
    })));
});

// Create shop (admin only)
router.post('/', requireAuth, async (req, res) => {
    const { name, expiresAt, notes, productIds, shippingEnabled } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'name is required' });
    }
    const slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6);
    const s = await prisma.shop.create({
        data: {
            name,
            slug,
            notes: notes ?? null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            ...(shippingEnabled !== undefined ? { shippingEnabled: Boolean(shippingEnabled) } : {}),
            ...(Array.isArray(productIds) && productIds.length
                ? { products: { connect: productIds.map((id: string) => ({ id })) } }
                : {})
        },
        include: { _count: { select: { products: true } } }
    });
    res.json(s);
});

// Get single shop by slug (public storefront) — enforces active + expiry
router.get('/:slug', async (req, res) => {
    const now = new Date();
    const s = await prisma.shop.findFirst({
        where: {
            slug: req.params.slug,
            active: true,
            archived: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
        },
        include: {
            products: {
                orderBy: { createdAt: 'desc' },
                // Pull in a linked adult/youth counterpart's full data even when
                // it isn't itself part of this shop's product list, so the
                // storefront's Adult/Youth toggle works regardless of whether
                // the admin also added the sibling product to this shop.
                include: { youthProduct: true, adultProduct: true }
            }
        }
    });
    if (!s) return res.status(404).json({ error: 'not found' });

    res.json({
        ...s,
        products: s.products.map(({ youthProduct, adultProduct, ...p }) => ({
            ...p,
            youthVariant: youthProduct ?? null,
            adultVariant: adultProduct ?? null
        }))
    });
});

// Update shop (toggle active, update name/notes/expiry/products) — admin only
router.patch('/:id', requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const { name, expiresAt, notes, active, archived, productIds, shippingEnabled } = req.body;

    const existing = await prisma.shop.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'shop not found' });

    const updated = await prisma.shop.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
            ...(notes !== undefined && { notes: notes ?? null }),
            ...(active !== undefined && { active }),
            // Archiving a live shop also takes it off the storefront — there's no
            // reason to archive a shop you still want customers ordering from.
            // Unarchiving does not re-activate it; the admin does that separately.
            ...(archived !== undefined && { archived: Boolean(archived), ...(archived ? { active: false } : {}) }),
            ...(shippingEnabled !== undefined && { shippingEnabled: Boolean(shippingEnabled) }),
            ...(Array.isArray(productIds) && { products: { set: productIds.map((pid: string) => ({ id: pid })) } })
        },
        include: { _count: { select: { products: true } } }
    });
    res.json(updated);
});
