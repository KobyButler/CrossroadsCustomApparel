import { Router } from 'express';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { submitOrderToSanMar } from '../vendors/sanmar.js';
import { submitOrderToSS } from '../vendors/ssactivewear.js';
import { vendorGroupKey, vendorStyleCode } from '../utils/vendorGrouping.js';

export const router = Router();

type ReportLine = {
    vendor: string; vendorStyle: string; image: string | null;
    productNames: string[]; skus: string[];
    color: string | null; size: string | null; quantity: number; sourceOrderIds: string[];
};

type LineSelector = { vendorStyle: string; color: string | null; size: string | null };

function firstImage(imagesJson: string | null): string | null {
    if (!imagesJson) return null;
    try { return JSON.parse(imagesJson)[0] ?? null; } catch { return null; }
}

function lineKey(vendorStyle: string, color: string | null, size: string | null) {
    return `${vendorStyle}|${color ?? ''}|${size ?? ''}`;
}

async function aggregate(shopId: string | undefined, status: string) {
    const where: any = { status };
    if (shopId) where.shopId = shopId;

    const orders = await prisma.order.findMany({
        where,
        include: { items: { include: { product: true } }, vendorOrders: true }
    });

    // Group by the underlying VENDOR product (style), not by our internal Product
    // row — the same vendor item can exist as multiple Crossroads products
    // (duplicates, or independently re-imported), and what matters for ordering
    // is the real vendor style/color/size combination.
    const lineMap = new Map<string, {
        vendor: string; vendorStyle: string; image: string | null;
        color: string | null; size: string | null; quantity: number;
        orderIds: Set<string>; products: Map<string, string>; // sku -> name
    }>();
    for (const o of orders) {
        for (const it of o.items) {
            const vStyle = vendorStyleCode(it.product);
            const key = `${vendorGroupKey(it.product)}|${it.color ?? ''}|${it.size ?? ''}`;
            if (!lineMap.has(key)) {
                lineMap.set(key, {
                    vendor: it.product.vendor, vendorStyle: vStyle, image: firstImage(it.product.imagesJson),
                    color: it.color, size: it.size, quantity: 0,
                    orderIds: new Set(), products: new Map()
                });
            }
            const l = lineMap.get(key)!;
            l.quantity += it.quantity;
            l.orderIds.add(o.id);
            l.products.set(it.product.sku, it.product.name);
            if (!l.image) l.image = firstImage(it.product.imagesJson);
        }
    }

    const lines: ReportLine[] = [...lineMap.values()]
        .map(l => ({
            vendor: l.vendor, vendorStyle: l.vendorStyle, image: l.image, color: l.color, size: l.size, quantity: l.quantity,
            sourceOrderIds: [...l.orderIds],
            skus: [...l.products.keys()], productNames: [...l.products.values()]
        }))
        .sort((a, b) => a.vendorStyle.localeCompare(b.vendorStyle) || (a.color ?? '').localeCompare(b.color ?? '') || (a.size ?? '').localeCompare(b.size ?? ''));

    const byVendor: Record<string, ReportLine[]> = {};
    for (const l of lines) (byVendor[l.vendor] ??= []).push(l);

    const alreadyOrdered: Record<string, string[]> = {};
    for (const vendor of Object.keys(byVendor)) {
        alreadyOrdered[vendor] = orders.filter(o => o.vendorOrders.some(vo => vo.vendor === vendor)).map(o => o.id);
    }

    return { orders, lines, byVendor, alreadyOrdered };
}

// GET /api/order-report?shopId=xxx&status=UNFULFILLED
router.get('/', async (req, res) => {
    const shopId = (req.query.shopId as string) || undefined;
    const status = (req.query.status as string) || 'UNFULFILLED';

    const shop = shopId ? await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true, name: true, slug: true } }) : null;
    const { orders, lines, byVendor, alreadyOrdered } = await aggregate(shopId, status);

    res.json({
        shop, status, generatedAt: new Date().toISOString(),
        orderCount: orders.length,
        lines, byVendor, alreadyOrdered
    });
});

// GET /api/order-report/ship-to — the address vendor POs will ship to, so the
// UI can show it during confirmation before anything is actually submitted.
router.get('/ship-to', async (_req, res) => {
    const b = config.business;
    res.json({
        name: b.name, email: b.email,
        address1: b.address1, address2: b.address2 || null,
        city: b.city, state: b.state, zip: b.zip,
        residential: b.residential,
        configured: Boolean(b.address1 && b.city && b.state && b.zip)
    });
});

// POST /api/order-report/place-order — submits a real PO to the vendor.
// Body: { shopId?, status, vendor, lines?: [{vendorStyle,color,size}] }
// If `lines` is omitted, every line currently shown for that vendor is ordered
// (the "current view"); if provided, only the selected lines are ordered.
// Quantities are always re-computed server-side from the DB — the client only
// gets to say *which* lines to include, never how much of each.
router.post('/place-order', async (req, res) => {
    const { shopId, status = 'UNFULFILLED', vendor, lines: selector } = req.body as {
        shopId?: string; status?: string; vendor?: string; lines?: LineSelector[];
    };
    if (vendor !== 'SANMAR' && vendor !== 'SSACTIVEWEAR') {
        return res.status(400).json({ error: 'vendor must be SANMAR or SSACTIVEWEAR' });
    }

    const b = config.business;
    if (!b.address1 || !b.city || !b.state || !b.zip) {
        return res.status(400).json({
            error: 'Set BUSINESS_ADDRESS1, BUSINESS_CITY, BUSINESS_STATE, and BUSINESS_ZIP in the server .env to enable direct vendor ordering.'
        });
    }

    const { orders } = await aggregate(shopId, status);
    const wantedKeys = selector && selector.length
        ? new Set(selector.map(s => lineKey(s.vendorStyle, s.color ?? null, s.size ?? null)))
        : null; // null = include everything for this vendor

    const lineMap = new Map<string, {
        item: { color: string | null; size: string | null; quantity: number };
        product: { vendorIdentifier: string | null; sku: string };
        productNames: Set<string>;
    }>();
    const contributingOrderIds = new Set<string>();
    for (const o of orders) {
        for (const it of o.items) {
            if (it.product.vendor !== vendor) continue;
            const vStyle = vendorStyleCode(it.product);
            const key = lineKey(vStyle, it.color, it.size);
            if (wantedKeys && !wantedKeys.has(key)) continue;

            if (!lineMap.has(key)) {
                lineMap.set(key, {
                    item: { color: it.color, size: it.size, quantity: 0 },
                    // Pass the resolved vendor style through as `sku` so the vendor
                    // clients (which look products up by product.sku) get the real
                    // vendor code even if the contributing Crossroads SKU was mangled.
                    product: { vendorIdentifier: it.product.vendorIdentifier, sku: vStyle },
                    productNames: new Set()
                });
            }
            const l = lineMap.get(key)!;
            l.item.quantity += it.quantity;
            l.productNames.add(it.product.name);
            contributingOrderIds.add(o.id);
        }
    }

    if (lineMap.size === 0) {
        return res.status(400).json({ error: `No ${vendor === 'SANMAR' ? 'SanMar' : 'S&S'} items found for this selection.` });
    }

    const lines = [...lineMap.values()];
    const totalUnits = lines.reduce((a, l) => a + l.item.quantity, 0);
    const poNumber = `restock-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const shipTo = {
        name: b.name, address1: b.address1, address2: b.address2 || null,
        city: b.city, state: b.state, zip: b.zip, residential: b.residential
    };
    const syntheticOrder = {
        id: poNumber,
        customerName: b.name,
        customerEmail: b.email,
        shipAddress1: b.address1,
        shipAddress2: b.address2 || undefined,
        shipCity: b.city,
        shipState: b.state,
        shipZip: b.zip,
        residential: b.residential,
    };

    try {
        const result = vendor === 'SANMAR'
            ? await submitOrderToSanMar(syntheticOrder, lines)
            : await submitOrderToSS(syntheticOrder, lines);

        const externalOrderNumber = vendor === 'SANMAR'
            ? (result?.poNumber ?? poNumber)
            : (Array.isArray(result) ? result.map((o: any) => o.orderNumber).filter(Boolean).join(',') || null : null);

        await Promise.all([...contributingOrderIds].map(orderId => prisma.vendorOrder.create({
            data: { orderId, vendor, externalOrderNumber, status: 'Submitted', rawResponse: JSON.stringify(result).slice(0, 65000) }
        })));

        res.json({
            success: true, poNumber, externalOrderNumber, vendor, placedAt: new Date().toISOString(),
            shipTo, totalUnits, ordersMarked: contributingOrderIds.size,
            lines: lines.map(l => ({
                vendorStyle: l.product.sku, color: l.item.color, size: l.item.size,
                quantity: l.item.quantity, productNames: [...l.productNames]
            })),
            result
        });
    } catch (err: any) {
        const rawResponse = String(err?.response?.data ? JSON.stringify(err.response.data) : err?.message ?? err).slice(0, 65000);
        await Promise.all([...contributingOrderIds].map(orderId => prisma.vendorOrder.create({
            data: { orderId, vendor, status: 'Error', rawResponse }
        })));
        res.status(502).json({ error: err?.response?.data?.message ?? err.message ?? 'Vendor order submission failed' });
    }
});
