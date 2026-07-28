import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { getShippingRate, Address } from '../vendors/shippo.js';

export type ShippingQuote = {
    cents: number;
    estimated: boolean; // true when using the flat-rate fallback rather than a live carrier rate
    provider?: string;
    service?: string;
    estimatedDays?: number | null;
};

// Computes total shipping weight for a cart, falling back to a default
// per-item weight for products that don't have one on file.
export async function totalWeightOz(items: { productId: string; quantity: number }[]): Promise<number> {
    const productIds = [...new Set(items.map(i => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, weightOz: true } });
    const weightById = new Map(products.map(p => [p.id, p.weightOz]));

    return items.reduce((total, i) => {
        const w = weightById.get(i.productId) ?? config.shipping.defaultItemWeightOz;
        return total + w * i.quantity;
    }, 0);
}

// Quotes shipping for a cart to a destination address. Uses live Shippo rates
// when configured; otherwise a flat-rate fallback so checkout still works.
export async function quoteShipping(
    items: { productId: string; quantity: number }[],
    to: { city: string; state: string; zip: string; residential?: boolean }
): Promise<ShippingQuote> {
    const weightOz = await totalWeightOz(items);

    if (config.shipping.enable) {
        const b = config.business;
        if (b.address1 && b.city && b.state && b.zip) {
            const from: Address = {
                name: b.name, street1: b.address1, street2: b.address2 || null,
                city: b.city, state: b.state, zip: b.zip, residential: b.residential
            };
            const toAddr: Address = { name: 'Customer', street1: '', city: to.city, state: to.state, zip: to.zip, residential: to.residential ?? true };
            try {
                const rate = await getShippingRate(from, toAddr, weightOz);
                if (rate) return { cents: rate.cents, estimated: false, provider: rate.provider, service: rate.service, estimatedDays: rate.estimatedDays };
            } catch {
                // fall through to flat-rate fallback below
            }
        }
    }

    return { cents: config.shipping.flatRateCents, estimated: true };
}
