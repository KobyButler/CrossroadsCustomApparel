import Stripe from 'stripe';
import { config } from '../config.js';

export type TaxAddress = { line1?: string | null; line2?: string | null; city: string; state: string; zip: string };

export type OrderTaxQuote = {
    calculationId: string | null;
    taxCentsByGroup: number[]; // aligned 1:1 with the groupSubtotals passed in
    totalTaxCents: number;
};

function zeroQuote(n: number): OrderTaxQuote {
    return { calculationId: null, taxCentsByGroup: new Array(n).fill(0), totalTaxCents: 0 };
}

// Calculates sales tax owed on a checkout via the Stripe Tax Calculations API.
// Used by BOTH the card checkout (payments.ts) and the offline cash/check/pickup
// checkout (orders.ts) — sales tax is owed on a sale regardless of how the
// customer pays, so it isn't a Stripe-payments-only concern.
//
// One shop group = one tax line item (Stripe's `reference` field lets us map
// each group's tax back out of the response), plus one shared shipping line for
// the whole cart (it all ships together). Returns taxCentsByGroup aligned with
// groupSubtotals so callers can fold it straight into each Order the same way
// shippingCents already is (see allocateShippingAcrossGroups).
//
// For "Ship to you" orders, tax is based on the destination address. For
// pickup, the sale happens at the business's own location, so the business
// address is used as both the customer's and the ship-from address.
//
// Fails soft to a $0 quote (logged loudly) if Stripe isn't configured, the
// business address isn't set, or the API call errors for any reason — so
// checkout never breaks because of it. A legitimate $0 (no tax registration
// covers this jurisdiction yet) looks identical to callers but is NOT an error
// and isn't logged — see the "Register UT now" step in project setup.
export async function quoteOrderTax(stripe: Stripe | null, opts: {
    groupSubtotals: number[];
    shippingCents: number;
    shippingMethod: 'SHIP' | 'PICKUP';
    shipAddress?: TaxAddress | null;
}): Promise<OrderTaxQuote> {
    const n = opts.groupSubtotals.length;
    const subtotalSum = opts.groupSubtotals.reduce((a, b) => a + b, 0);
    if (subtotalSum <= 0 && opts.shippingCents <= 0) return zeroQuote(n);

    if (!stripe) {
        console.error('[tax] STRIPE_SECRET_KEY is not set — cannot calculate sales tax, charging $0 tax for this order.');
        return zeroQuote(n);
    }

    const biz = config.business;
    if (!biz.address1 || !biz.city || !biz.state || !biz.zip) {
        console.error('[tax] BUSINESS_ADDRESS1/CITY/STATE/ZIP are not fully set in server/.env — skipping Stripe Tax calculation (order will show $0 tax).');
        return zeroQuote(n);
    }

    const dest: TaxAddress = opts.shippingMethod === 'SHIP' && opts.shipAddress
        ? opts.shipAddress
        : { line1: biz.address1, line2: biz.address2 || null, city: biz.city, state: biz.state, zip: biz.zip };

    try {
        const calc = await stripe.tax.calculations.create({
            currency: 'usd',
            customer_details: {
                address: {
                    line1: dest.line1 || biz.address1,
                    line2: dest.line2 || undefined,
                    city: dest.city,
                    state: dest.state,
                    postal_code: dest.zip,
                    country: 'US'
                },
                address_source: 'shipping'
            },
            ship_from_details: {
                address: {
                    line1: biz.address1,
                    line2: biz.address2 || undefined,
                    city: biz.city,
                    state: biz.state,
                    postal_code: biz.zip,
                    country: 'US'
                }
            },
            line_items: opts.groupSubtotals.map((cents, i) => ({
                amount: Math.max(0, cents),
                reference: `group-${i}`,
                tax_code: config.stripe.taxCode
            })),
            ...(opts.shippingCents > 0
                ? { shipping_cost: { amount: opts.shippingCents, tax_code: config.stripe.taxShippingCode } }
                : {}),
            expand: ['line_items']
        });

        const taxCentsByGroup = new Array(n).fill(0);
        for (const li of calc.line_items?.data ?? []) {
            const m = /^group-(\d+)$/.exec(li.reference ?? '');
            if (m) taxCentsByGroup[Number(m[1])] = li.amount_tax;
        }

        // The cart's one shared shipping charge gets one shared shipping-tax
        // amount back from Stripe — spread it across groups by subtotal share,
        // the same way allocateShippingAcrossGroups spreads the charge itself
        // (last group absorbs the rounding remainder).
        const shippingTax = calc.shipping_cost?.amount_tax ?? 0;
        if (shippingTax > 0) {
            let allocated = 0;
            opts.groupSubtotals.forEach((cents, i) => {
                const isLast = i === n - 1;
                const share = isLast
                    ? shippingTax - allocated
                    : (subtotalSum > 0 ? Math.round((cents / subtotalSum) * shippingTax) : Math.round(shippingTax / n));
                allocated += share;
                taxCentsByGroup[i] += share;
            });
        }

        return { calculationId: calc.id, taxCentsByGroup, totalTaxCents: taxCentsByGroup.reduce((a, b) => a + b, 0) };
    } catch (err: any) {
        console.error('[tax] Stripe Tax calculation failed — charging $0 tax for this order:', err?.message ?? err);
        return zeroQuote(n);
    }
}
