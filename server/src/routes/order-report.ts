import { Router } from 'express';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { submitOrderToSanMar } from '../vendors/sanmar.js';
import { submitOrderToSS } from '../vendors/ssactivewear.js';

export const router = Router();

type ReportLine = {
    productId: string; productName: string; sku: string; vendor: string; image: string | null;
    color: string | null; size: string | null; quantity: number; sourceOrderIds: string[];
};

function firstImage(imagesJson: string | null): string | null {
    if (!imagesJson) return null;
    try { return JSON.parse(imagesJson)[0] ?? null; } catch { return null; }
}

async function aggregate(shopId: string | undefined, status: string) {
    const where: any = { status };
    if (shopId) where.shopId = shopId;

    const orders = await prisma.order.findMany({
        where,
        include: { items: { include: { product: true } }, vendorOrders: true }
    });

    const lineMap = new Map<string, ReportLine & { _orderIds: Set<string> }>();
    for (const o of orders) {
        for (const it of o.items) {
            const key = `${it.productId}|${it.color ?? ''}|${it.size ?? ''}`;
            if (!lineMap.has(key)) {
                lineMap.set(key, {
                    productId: it.productId, productName: it.product.name, sku: it.product.sku,
                    vendor: it.product.vendor, image: firstImage(it.product.imagesJson),
                    color: it.color, size: it.size, quantity: 0, sourceOrderIds: [], _orderIds: new Set()
                });
            }
            const l = lineMap.get(key)!;
            l.quantity += it.quantity;
            l._orderIds.add(o.id);
        }
    }

    const lines: ReportLine[] = [...lineMap.values()]
        .map(({ _orderIds, ...rest }) => ({ ...rest, sourceOrderIds: [..._orderIds] }))
        .sort((a, b) => a.productName.localeCompare(b.productName) || (a.color ?? '').localeCompare(b.color ?? '') || (a.size ?? '').localeCompare(b.size ?? ''));

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

// POST /api/order-report/place-order — submits a real PO to the vendor for the
// aggregated quantities (re-computed server-side, never trusting client totals).
router.post('/place-order', async (req, res) => {
    const { shopId, status = 'UNFULFILLED', vendor } = req.body as { shopId?: string; status?: string; vendor?: string };
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

    const lineMap = new Map<string, { item: { color: string | null; size: string | null; quantity: number }; product: { vendorIdentifier: string | null; sku: string } }>();
    const contributingOrderIds = new Set<string>();
    for (const o of orders) {
        for (const it of o.items) {
            if (it.product.vendor !== vendor) continue;
            const key = `${it.productId}|${it.color ?? ''}|${it.size ?? ''}`;
            if (!lineMap.has(key)) {
                lineMap.set(key, {
                    item: { color: it.color, size: it.size, quantity: 0 },
                    product: { vendorIdentifier: it.product.vendorIdentifier, sku: it.product.sku }
                });
            }
            lineMap.get(key)!.item.quantity += it.quantity;
            contributingOrderIds.add(o.id);
        }
    }

    if (lineMap.size === 0) {
        return res.status(400).json({ error: `No ${vendor === 'SANMAR' ? 'SanMar' : 'S&S'} items found for this selection.` });
    }

    const lines = [...lineMap.values()];
    const poNumber = `restock-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

        res.json({ success: true, poNumber, result, ordersMarked: contributingOrderIds.size });
    } catch (err: any) {
        const rawResponse = String(err?.response?.data ? JSON.stringify(err.response.data) : err?.message ?? err).slice(0, 65000);
        await Promise.all([...contributingOrderIds].map(orderId => prisma.vendorOrder.create({
            data: { orderId, vendor, status: 'Error', rawResponse }
        })));
        res.status(502).json({ error: err?.response?.data?.message ?? err.message ?? 'Vendor order submission failed' });
    }
});
