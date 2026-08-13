import { prisma } from '../prisma.js';
import { computeItemPriceCents } from './pricing.js';

export type CheckoutItemInput = {
    productId: string;
    quantity: number;
    size?: string | null;
    color?: string | null;
    shopSlug?: string | null;
};

export type ShopGroup = {
    slug: string | null;
    shopId: string | null;
    shopName: string | null;
    shopShippingEnabled: boolean;
    items: { productId: string; quantity: number; size: string | null; color: string | null; priceCents: number }[];
    subtotal: number;
    shippingCents: number;
};

// Resolves products + per-item pricing (including size upcharges), then groups
// cart items by the shop they were added from. A single-shop checkout produces
// one group; a cross-shop cart produces one group per shop.
export async function buildShopGroups(
    items: CheckoutItemInput[],
    topLevelShopSlug?: string | null
): Promise<ShopGroup[]> {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('items are required');
    }

    const uniqueProductIds = [...new Set(items.map(i => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: uniqueProductIds } } });
    if (products.length !== uniqueProductIds.length) {
        throw new Error('One or more products were not found');
    }
    const productMap = new Map(products.map(p => [p.id, p]));

    const slugs = [...new Set(items.map(i => i.shopSlug ?? topLevelShopSlug ?? null).filter((s): s is string => !!s))];
    const shops = slugs.length ? await prisma.shop.findMany({ where: { slug: { in: slugs } } }) : [];
    const shopBySlug = new Map(shops.map(s => [s.slug, s]));

    const groups = new Map<string | null, ShopGroup>();
    for (const i of items) {
        const slug = i.shopSlug ?? topLevelShopSlug ?? null;
        const product = productMap.get(i.productId)!;
        const priceCents = computeItemPriceCents(product, i.size);
        if (!groups.has(slug)) {
            const shop = slug ? shopBySlug.get(slug) : undefined;
            groups.set(slug, {
                slug, shopId: shop?.id ?? null, shopName: shop?.name ?? null,
                shopShippingEnabled: shop?.shippingEnabled ?? true,
                items: [], subtotal: 0, shippingCents: 0
            });
        }
        const g = groups.get(slug)!;
        g.items.push({ productId: product.id, quantity: i.quantity, size: i.size ?? null, color: i.color ?? null, priceCents });
        g.subtotal += priceCents * i.quantity;
    }
    return [...groups.values()];
}

// Applies a flat/percent discount to the combined total, then distributes the
// resulting total back across shop groups proportionally to their share of the
// original subtotal (last group absorbs any rounding remainder).
export function applyDiscountAcrossGroups(
    groups: ShopGroup[],
    discount: { type: string; value: number } | null
): { groups: ShopGroup[]; originalSubtotal: number; discountedTotal: number } {
    const originalSubtotal = groups.reduce((a, g) => a + g.subtotal, 0);
    if (!discount || originalSubtotal === 0) {
        return { groups, originalSubtotal, discountedTotal: originalSubtotal };
    }

    const discountedTotal = discount.type === 'PERCENT'
        ? Math.max(0, Math.round(originalSubtotal * (100 - discount.value) / 100))
        : Math.max(0, originalSubtotal - discount.value);

    let allocated = 0;
    const adjusted = groups.map((g, idx) => {
        if (idx === groups.length - 1) {
            return { ...g, subtotal: discountedTotal - allocated };
        }
        const share = originalSubtotal > 0 ? Math.round((g.subtotal / originalSubtotal) * discountedTotal) : 0;
        allocated += share;
        return { ...g, subtotal: share };
    });

    return { groups: adjusted, originalSubtotal, discountedTotal };
}

// Distributes one combined shipping charge (the whole cart ships together)
// across shop groups proportionally to their share of the subtotal, so each
// Order's totalCents stays accurate on its own (last group absorbs rounding).
export function allocateShippingAcrossGroups(groups: ShopGroup[], totalShippingCents: number): ShopGroup[] {
    if (totalShippingCents <= 0) return groups.map(g => ({ ...g, shippingCents: 0 }));

    const subtotalSum = groups.reduce((a, g) => a + g.subtotal, 0);
    let allocated = 0;
    return groups.map((g, idx) => {
        if (idx === groups.length - 1) {
            return { ...g, shippingCents: totalShippingCents - allocated };
        }
        const share = subtotalSum > 0 ? Math.round((g.subtotal / subtotalSum) * totalShippingCents) : Math.round(totalShippingCents / groups.length);
        allocated += share;
        return { ...g, shippingCents: share };
    });
}

export function newOrderGroupId(): string {
    return `og_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Throws if the customer chose "Ship" but any shop represented in the cart has
// shipping disabled — the whole cart ships together, so one shop opting out
// means the combined order can't ship at all. Re-checked server-side since the
// UI restriction alone could be bypassed by a direct API call.
export function assertShippingAllowed(groups: ShopGroup[]): void {
    const blocked = groups.find(g => !g.shopShippingEnabled);
    if (blocked) {
        throw new Error(
            blocked.shopName
                ? `"${blocked.shopName}" does not offer shipping — please choose pickup instead.`
                : 'One of the shops in your cart does not offer shipping — please choose pickup instead.'
        );
    }
}
