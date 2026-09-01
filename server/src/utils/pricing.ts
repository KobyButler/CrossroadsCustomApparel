// Sizes that count as "bigger sizes" for the optional per-product upcharge
// (2XL and anything larger — 3XL, 4XL, XXL, etc). XL itself is not upcharged.
export function isUpchargeSize(size: string | null | undefined): boolean {
    if (!size) return false;
    const s = size.trim().toUpperCase().replace(/\s+/g, '');
    // 2XL, 3XL, 4XL... / 2X, 3X... / XXL, XXXL... (but not plain XL)
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

// A linked youth product's own priceCents is never what a customer should be
// shown or charged (it's frequently just whatever the row was created with —
// e.g. a raw SanMar wholesale import cost the admin never touched, since the
// admin's actual pricing work happens on the adult product). The youth
// variant's real price is its parent adult product's own admin-set
// youthPriceCents override, or — the default, and what every product with no
// override resolves to — the adult's own priceCents, kept in sync
// automatically as the admin changes it. Call this on any product that might
// BE a linked youth variant (i.e. was fetched with its `adultProduct` back-
// relation included) before computeItemPriceCents ever sees its priceCents.
// A product with no adultProduct (not a youth variant of anything) is
// returned unchanged.
export function resolveProductPriceCents(product: {
    priceCents: number;
    adultProduct?: { priceCents: number; youthPriceCents?: number | null } | null;
}): number {
    if (product.adultProduct) {
        return product.adultProduct.youthPriceCents ?? product.adultProduct.priceCents;
    }
    return product.priceCents;
}
