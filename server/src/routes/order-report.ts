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

// Strips a string down to something safe to embed in a vendor-facing PO number
// field (letters/digits only, hyphen-joined) — vendor PO fields tend to be picky
// about punctuation, so this errs conservative rather than risking another
// vendor-side validation rejection.
function sanitizeForPoNumber(s: string): string {
    return s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// PO reference format: RS-{ShopName}-{YYMMDD}-{uniqueId}. SanMar rejects PO
// numbers over 28 characters (confirmed live: "PO Number length exceeds
// maximum of 28 characters") — the date and unique-id segments are fixed-width
// and never dropped (that's what keeps two same-day POs for one shop
// distinguishable), so the shop name is what flexes: it's truncated to
// whatever's left after everything else is accounted for. Falls back to
// "AllShops" when no single shop was selected.
function buildPoNumber(shopName: string | null): string {
    const MAX_LEN = 28;
    const PREFIX = 'RS';
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD, e.g. "260819"
    const uniqueId = Math.random().toString(36).slice(2, 6).toUpperCase(); // 4 chars

    const fixed = `${PREFIX}-${datePart}-${uniqueId}`; // e.g. "RS-260819-XF3Q" (14 chars)
    const shopBudget = Math.max(0, MAX_LEN - fixed.length - 1); // -1 for the separator before the shop segment

    const shopPart = sanitizeForPoNumber((shopName ?? 'AllShops').slice(0, shopBudget));

    return shopPart ? `${PREFIX}-${shopPart}-${datePart}-${uniqueId}` : fixed;
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

// GET /api/order-report/history?vendor=SANMAR&limit=100 — past PO submissions,
// one entry per real submission (a single "place order" click fans out into one
// VendorOrder row per contributing customer order, sharing the same
// externalOrderNumber — this groups those back into a single history entry so a
// PO covering 5 customer orders shows up once, not five times).
router.get('/history', async (req, res) => {
    const vendor = (req.query.vendor as string) || 'SANMAR';
    const limit = Math.min(parseInt(req.query.limit as string ?? '100', 10) || 100, 300);

    const rows = await prisma.vendorOrder.findMany({
        where: { vendor },
        include: { shop: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit * 5 // rows fan out per contributing order — over-fetch, then collapse below
    });

    const groups = new Map<string, {
        id: string; poNumber: string; vendor: string; status: string; createdAt: Date;
        shopName: string | null; totalUnits: number | null;
        lines: any[] | null; rawResponse: string | null; contributingOrderCount: number;
    }>();
    for (const vo of rows) {
        // Older rows predating this feature never got a real reference number
        // (especially failed/"Error" submissions — fixed going forward, see the
        // catch block above). Group those by a short time bucket instead of the
        // row's own id, so one legacy fan-out batch still collapses into a single
        // history entry instead of one row per contributing order. Multiple such
        // legacy groups can still display the same "(no reference)" text, so `key`
        // (unlike `poNumber`) is always unique and is what the UI keys/expands on.
        const key = vo.externalOrderNumber ?? `noref|${vo.vendor}|${vo.status}|${Math.floor(vo.createdAt.getTime() / 5000)}`;
        if (!groups.has(key)) {
            let lines: any[] | null = null;
            try { lines = vo.linesJson ? JSON.parse(vo.linesJson) : null; } catch { lines = null; }
            groups.set(key, {
                id: key, poNumber: vo.externalOrderNumber ?? '(no reference)', vendor: vo.vendor, status: vo.status,
                createdAt: vo.createdAt, shopName: vo.shop?.name ?? null, totalUnits: vo.totalUnits,
                lines, rawResponse: vo.rawResponse, contributingOrderCount: 0
            });
        }
        groups.get(key)!.contributingOrderCount += 1;
    }

    const history = [...groups.values()]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

    // Garment type/category isn't captured on the order line itself (it's a
    // property of the vendor style, not the order) — look it up from the synced
    // SanMar catalog by style code and attach it to each line for display/export.
    const allStyles = [...new Set(history.flatMap(h => (h.lines ?? []).map((l: any) => l.vendorStyle).filter(Boolean)))];
    const categoryRows = allStyles.length
        ? await prisma.sanmarCatalogProduct.findMany({
            where: { style: { in: allStyles } },
            select: { style: true, category: true },
            distinct: ['style']
        })
        : [];
    const categoryByStyle = new Map(categoryRows.map(r => [r.style, r.category]));
    for (const h of history) {
        if (h.lines) {
            h.lines = h.lines.map((l: any) => ({
                ...l,
                category: l.vendorStyle ? (categoryByStyle.get(l.vendorStyle) ?? null) : null
            }));
        }
    }

    res.json({ history });
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

    const shop = shopId ? await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true, name: true } }) : null;
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
    const poNumber = buildPoNumber(shop?.name ?? null);
    // Captured up front so a failed submission still records exactly what it was
    // trying to send — a PO that errors out is still worth being able to look up
    // and see the reference number and itemized contents for, not just "Error".
    const linesJson = JSON.stringify(lines.map(l => ({
        vendorStyle: l.product.sku, color: l.item.color, size: l.item.size,
        quantity: l.item.quantity, productNames: [...l.productNames]
    })));
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

        // A dry-run (vendor integration disabled) and a genuine successful submission
        // must never look identical — a dry-run means NOTHING was actually sent to the
        // vendor, so the DB record and the API response both need to say so unmistakably.
        const isDryRun = Boolean((result as any)?.dryRun);

        const externalOrderNumber = vendor === 'SANMAR'
            ? (result?.poNumber ?? poNumber)
            : (Array.isArray(result) ? result.map((o: any) => o.orderNumber).filter(Boolean).join(',') || null : null);

        // SanMar's own confirmation text (e.g. "PO submitted successfully") — genuine
        // evidence from the vendor, not just our own success flag. Not applicable to
        // S&S, whose client returns an array of per-order results instead.
        const vendorMessage = vendor === 'SANMAR' && !Array.isArray(result) ? ((result as any)?.message ?? null) : null;

        await Promise.all([...contributingOrderIds].map(orderId => prisma.vendorOrder.create({
            data: {
                orderId, vendor, externalOrderNumber,
                status: isDryRun ? 'NotSent' : 'Submitted',
                rawResponse: JSON.stringify(result).slice(0, 65000),
                shopId: shop?.id ?? null, linesJson, totalUnits
            }
        })));

        res.json({
            success: true, dryRun: isDryRun, dryRunNote: isDryRun ? (result as any)?.note ?? null : null,
            vendorMessage,
            poNumber, externalOrderNumber, vendor, placedAt: new Date().toISOString(),
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
            data: {
                orderId, vendor, status: 'Error', rawResponse,
                // Same reference/shop/lines the attempt would have used had it
                // succeeded — a failed PO is still worth being able to look up.
                externalOrderNumber: poNumber, shopId: shop?.id ?? null, linesJson, totalUnits
            }
        })));
        res.status(502).json({ error: err?.response?.data?.message ?? err.message ?? 'Vendor order submission failed' });
    }
});
