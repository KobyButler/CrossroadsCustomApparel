import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { getShippingRate, purchaseShippingLabel, Address, PurchasedLabel } from '../vendors/shippo.js';

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

// The business's own address, used as the "ship from" on both rate quotes and
// purchased labels. Null when it hasn't been filled in yet (see
// order_report_business_address memory — required before any real Shippo call works).
function businessFromAddress(): Address | null {
    const b = config.business;
    if (!b.address1 || !b.city || !b.state || !b.zip) return null;
    return { name: b.name, street1: b.address1, street2: b.address2 || null, city: b.city, state: b.state, zip: b.zip, residential: b.residential };
}

// Buys a real, print-ready shipping label for an already-placed order via
// Shippo. Throws with a message safe to show an admin (missing config,
// incomplete address, no rates, etc.) rather than a raw axios error.
export async function buyLabelForOrder(order: {
    items: { productId: string; quantity: number }[];
    customerName: string; customerEmail: string;
    shipAddress1: string | null; shipAddress2: string | null;
    shipCity: string | null; shipState: string | null; shipZip: string | null;
    residential: boolean;
}): Promise<PurchasedLabel> {
    if (!config.shipping.enable) {
        throw new Error('Shipping isn\'t configured — set SHIPPO_API_KEY on the server');
    }
    const from = businessFromAddress();
    if (!from) {
        throw new Error('Business address isn\'t set — fill in BUSINESS_ADDRESS1/CITY/STATE/ZIP before buying labels');
    }
    if (!order.shipAddress1 || !order.shipCity || !order.shipState || !order.shipZip) {
        throw new Error('This order is missing a full shipping address');
    }

    const to: Address = {
        name: order.customerName, street1: order.shipAddress1, street2: order.shipAddress2,
        city: order.shipCity, state: order.shipState, zip: order.shipZip,
        residential: order.residential, email: order.customerEmail
    };
    const weightOz = await totalWeightOz(order.items);
    return purchaseShippingLabel(from, to, weightOz);
}
