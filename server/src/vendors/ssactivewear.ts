import axios from 'axios';
import { config } from '../config.js';

type LineGroup = Array<{
    item: any;
    product: { vendorIdentifier: string | null; sku: string };
}>;

function authHeader() {
    const basic = Buffer.from(`${config.ss.user}:${config.ss.apiKey}`).toString('base64');
    return { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' };
}

// Resolve the exact per-color/size S&S SKU for an order line. Product.vendorIdentifier
// holds the numeric S&S styleID; each style has one SKU per color+size combination,
// so we look it up from the live catalog rather than ordering against the style code.
async function resolveVariantSku(styleId: string, color: string | null, size: string | null): Promise<string | null> {
    if (!styleId || !/^\d+$/.test(styleId)) return null;
    try {
        const resp = await axios.get('https://api.ssactivewear.com/v2/products/', {
            headers: authHeader(),
            params: { styleID: Number(styleId) },
            timeout: 10000,
        });
        const rows: any[] = Array.isArray(resp.data) ? resp.data : [];
        const match = rows.find(r => r.colorName === color && r.sizeName === size);
        return match?.sku ?? null;
    } catch {
        return null;
    }
}

export async function submitOrderToSS(order: any, lines: LineGroup) {
    if (!config.ss.enable) return { dryRun: true, note: 'SS_ENABLE=false' };

    const resolvedLines = await Promise.all(lines.map(async ({ item, product }) => {
        const variantSku = product.vendorIdentifier
            ? await resolveVariantSku(product.vendorIdentifier, item.color ?? null, item.size ?? null)
            : null;
        return {
            identifier: variantSku ?? product.vendorIdentifier ?? product.sku,
            qty: item.quantity
        };
    }));

    const payload = {
        shippingAddress: {
            customer: order.customerName,
            attn: order.customerName,
            address: order.shipAddress1,
            city: order.shipCity,
            state: order.shipState,
            zip: order.shipZip,
            residential: order.residential
        },
        shippingMethod: '1',
        shipBlind: true,
        poNumber: order.id,
        emailConfirmation: order.customerEmail ?? '',
        testOrder: false,
        autoselectWarehouse: true,
        lines: resolvedLines
    };

    const basic = Buffer.from(`${config.ss.user}:${config.ss.apiKey}`).toString('base64');
    const resp = await axios.post('https://api.ssactivewear.com/v2/orders/', payload, {
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/json'
        },
        timeout: 15000
    });

    return resp.data;
}
