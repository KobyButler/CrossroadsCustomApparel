import Stripe from 'stripe';
import { config } from '../config.js';

// Card payments (payments.ts) require a Stripe key — no sensible fallback,
// so this throws if it's missing.
export function getStripe(): Stripe {
    if (!config.stripe.secretKey) throw new Error('STRIPE_SECRET_KEY is not set');
    return new Stripe(config.stripe.secretKey);
}

// Cash/check/pickup checkout (orders.ts) doesn't otherwise need Stripe at all —
// it only reaches Stripe to calculate sales tax. Returns null instead of
// throwing so that flow keeps working (with $0 calculated tax, logged loudly
// by quoteOrderTax) in an environment where Stripe isn't configured.
export function getStripeOrNull(): Stripe | null {
    return config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;
}
