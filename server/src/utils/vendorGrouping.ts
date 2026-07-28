// The "Duplicate" product feature appends " (1)", " (2)", etc. to the Crossroads
// SKU. Strip that back off when we need to reason about the underlying vendor
// item (e.g. for grouping or for looking up a SanMar catalog style).
export function stripDuplicateSuffix(sku: string): string {
    return sku.replace(/\s*\(\d+\)\s*$/, '');
}

// The vendor's own style/product code for a given Product — used to look up
// vendor catalogs and to submit real POs. Falls back to the (suffix-stripped)
// Crossroads SKU for products that don't have vendorIdentifier set (manual
// entries, or anything predating this field).
export function vendorStyleCode(product: { vendorIdentifier: string | null; sku: string }): string {
    return product.vendorIdentifier || stripDuplicateSuffix(product.sku);
}

// Groups products that represent the *same underlying vendor item* even when
// they were created as separate Product rows in Crossroads (duplicates, or two
// independent imports of the same style). Two Products with different
// Crossroads SKUs/names but the same vendor + vendor style code collapse to
// one group.
export function vendorGroupKey(product: { vendor: string; vendorIdentifier: string | null; sku: string }): string {
    return `${product.vendor}::${vendorStyleCode(product)}`;
}
