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
    size?: string | null,
    variationPriceCents?: number | null
): number {
    let cents = product.priceCents;
    if (product.upchargeEnabled && isUpchargeSize(size)) cents += product.upchargeCents ?? 0;
    if (variationPriceCents) cents += variationPriceCents;
    return cents;
}

export type VariationSelectionInput = {
    variationId: string;
    textValue?: string | null;
    choiceId?: string | null;
};

export type ResolvedVariationSelection = {
    variationId: string;
    name: string;
    type: string;
    textValue: string | null;
    choiceLabel: string | null;
    choiceImageUrl: string | null;
    priceCents: number;
};

type VariationChoiceDef = { id: string; label: string; imageUrl: string | null; priceCents: number };
type VariationDef = { id: string; name: string; type: string; required: boolean; priceCents: number; choices: VariationChoiceDef[] };

// Validates a shopper's variation selections against a product's actual
// configured variations and resolves each into a priced, snapshot-ready row
// (see OrderItemVariation) — never trusting a client-supplied label, image,
// or price, only the variationId/choiceId it picked. A required variation
// with no matching selection (or an unknown/stale choiceId — e.g. the admin
// deleted that choice after the shopper loaded the page) fails the whole
// item rather than silently dropping or guessing at a charge. An optional
// variation left unanswered is simply omitted — not an error.
export function resolveItemVariations(
    productVariations: VariationDef[],
    selections: VariationSelectionInput[]
): { resolved: ResolvedVariationSelection[]; totalPriceCents: number; error: string | null } {
    const selByVariationId = new Map(selections.map(s => [s.variationId, s]));
    const resolved: ResolvedVariationSelection[] = [];
    let totalPriceCents = 0;

    for (const v of productVariations) {
        const sel = selByVariationId.get(v.id);
        if (v.type === 'CHOICE') {
            const choice = sel?.choiceId ? v.choices.find(c => c.id === sel.choiceId) : undefined;
            if (!choice) {
                if (v.required) return { resolved: [], totalPriceCents: 0, error: `Please make a selection for "${v.name}".` };
                continue;
            }
            resolved.push({ variationId: v.id, name: v.name, type: v.type, textValue: null, choiceLabel: choice.label, choiceImageUrl: choice.imageUrl, priceCents: choice.priceCents });
            totalPriceCents += choice.priceCents;
        } else {
            const text = sel?.textValue?.trim();
            if (!text) {
                if (v.required) return { resolved: [], totalPriceCents: 0, error: `"${v.name}" is required.` };
                continue;
            }
            resolved.push({ variationId: v.id, name: v.name, type: v.type, textValue: text, choiceLabel: null, choiceImageUrl: null, priceCents: v.priceCents });
            totalPriceCents += v.priceCents;
        }
    }
    return { resolved, totalPriceCents, error: null };
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

// The same youth product can now be linked from several different adult
// products (see Product.adultProducts in schema.prisma), each potentially
// with its own youthPriceCents override. That's only unambiguous when the
// caller actually knows which specific adult a shopper added the youth item
// relative to (explicitAdult — see youthContextAdultId on cart items), which
// is validated against the youth product's own id so a client can't claim an
// unrelated adult's override. Without that context, an override is only
// applied when there's exactly one possible parent adult; with zero or
// several, falls back to the youth product's own raw priceCents rather than
// guessing whose override should win.
export function pickYouthPricingContext<A extends { id: string; priceCents: number; youthPriceCents: number | null }>(
    product: { id: string; adultProducts: A[] },
    explicitAdult?: (A & { youthProductId: string | null }) | null
): A | null {
    if (explicitAdult && explicitAdult.youthProductId === product.id) return explicitAdult;
    return product.adultProducts.length === 1 ? product.adultProducts[0] : null;
}
