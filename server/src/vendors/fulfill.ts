import { prisma } from '../prisma.js';
import { submitOrderToSS } from './ssactivewear.js';
import { submitOrderToSanMar } from './sanmar.js';

export async function triggerVendorFulfillment(order: any) {
    // Group items by vendor (string)
    const itemsByVendor = new Map<string, Array<{ item: any; product: any }>>();

    // Ensure items include product; if not, load them
    const items = order.items?.length
        ? order.items
        : await prisma.orderItem.findMany({ where: { orderId: order.id }, include: { product: true } });

    for (const it of items) {
        const product = it.product ?? (await prisma.product.findUnique({ where: { id: it.productId } }));
        if (!product) continue;
        const key = product.vendor || 'OTHER';
        const arr = itemsByVendor.get(key) ?? [];
        arr.push({ item: it, product });
        itemsByVendor.set(key, arr);
    }

    for (const [vendor, arr] of itemsByVendor.entries()) {
        try {
            if (vendor === 'SSACTIVEWEAR') {
                const resp = await submitOrderToSS(order, arr);
                await prisma.vendorOrder.create({
                    data: {
                        orderId: order.id,
                        vendor,
                        externalOrderNumber: Array.isArray(resp) ? resp.map((o: any) => o.orderNumber).join(',') : null,
                        status: 'Submitted',
                        rawResponse: JSON.stringify(resp).slice(0, 65000)
                    }
                });
            } else if (vendor === 'SANMAR') {
                const resp = await submitOrderToSanMar(order, arr);
                await prisma.vendorOrder.create({
                    data: {
                        orderId: order.id,
                        vendor,
                        externalOrderNumber: resp?.poNumber ?? null,
                        status: resp?.message ?? 'Submitted',
                        rawResponse: JSON.stringify(resp).slice(0, 65000)
                    }
                });
            }
        } catch (err: any) {
            await prisma.vendorOrder.create({
                data: {
                    orderId: order.id,
                    vendor,
                    status: 'Error',
                    rawResponse: String(err?.response?.data ?? err?.message ?? err).slice(0, 65000)
                }
            });
        }
    }
}
