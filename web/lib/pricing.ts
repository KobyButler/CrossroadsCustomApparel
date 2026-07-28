// Sizes that count as "bigger sizes" for the optional per-product upcharge
// (XL and anything larger — 2XL, 3XL, XXL, etc). Mirrors server/src/utils/pricing.ts.
export function isUpchargeSize(size: string | null | undefined): boolean {
    if (!size) return false;
    const s = size.trim().toUpperCase().replace(/\s+/g, "");
    if (s === "XL") return true;
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
