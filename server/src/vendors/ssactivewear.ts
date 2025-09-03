import axios from 'axios';
import { config } from '../config.js';

type LineGroup = Array<{
    item: any;
    product: { vendorIdentifier: string | null; sku: string };
}>;

export async function submitOrderToSS(order: any, lines: LineGroup) {
    if (!config.ss.enable) return { dryRun: true, note: 'SS_ENABLE=false' };

    const basic = Buffer.from(`${config.ss.user}:${config.ss.apiKey}`).toString('base64');

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
        lines: lines.map(({ item, product }) => ({
            identifier: product.vendorIdentifier ?? product.sku,
            qty: item.quantity
        }))
    };

    const resp = await axios.post('https://api.ssactivewear.com/v2/orders/', payload, {
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/json'
        },
        timeout: 15000
    });

    return resp.data;
}
