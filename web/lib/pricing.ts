// Sizes that count as "bigger sizes" for the optional per-product upcharge
// (2XL and anything larger — 3XL, 4XL, XXL, etc). XL itself is not upcharged.
// Mirrors server/src/utils/pricing.ts.
export function isUpchargeSize(size: string | null | undefined): boolean {
    if (!size) return false;
    const s = size.trim().toUpperCase().replace(/\s+/g, "");
    return /^\d+X(L)?$/.test(s) || /^X{2,}(L)?$/.test(s);
}

export function computeItemPriceCents(
    product: { priceCents: number; upchargeEnabled?: boolean | null; upchargeCents?: number | null },
    size?: string | null
): number {
    if (product.upchargeEnabled && isUpchargeSize(size)) {
        return product.priceCents + (product.upchargeCents ?? 0);
    }
    return product.priceCents;
}
