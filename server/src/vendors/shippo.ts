import axios from 'axios';
import { config } from '../config.js';

export type Address = {
    name: string;
    street1: string;
    street2?: string | null;
    city: string;
    state: string;
    zip: string;
    residential?: boolean;
};

export type RateQuote = { cents: number; provider: string; service: string; estimatedDays: number | null };

// A single default parcel size covering a typical small group-order shipment
// (a handful of folded shirts/hoodies). Good enough for an estimate; refine
// later if orders regularly run much larger.
const DEFAULT_PARCEL = { length: '14', width: '11', height: '4', distance_unit: 'in' as const };

function authHeader() {
    return { Authorization: `ShippoToken ${config.shipping.shippoApiKey}`, 'Content-Type': 'application/json' };
}

// Returns the cheapest reasonable ground/standard rate for the given weight
// and destination, or null if Shippo isn't configured or returns no rates.
export async function getShippingRate(from: Address, to: Address, totalWeightOz: number): Promise<RateQuote | null> {
    if (!config.shipping.enable) return null;

    const payload = {
        address_from: {
            name: from.name, street1: from.street1, street2: from.street2 || undefined,
            city: from.city, state: from.state, zip: from.zip, country: 'US'
        },
        address_to: {
            name: to.name, street1: to.street1, street2: to.street2 || undefined,
            city: to.city, state: to.state, zip: to.zip, country: 'US'
        },
        parcels: [{
            ...DEFAULT_PARCEL,
            weight: String(Math.max(totalWeightOz, 1)),
            mass_unit: 'oz'
        }],
        async: false
    };

    const resp = await axios.post('https://api.goshippo.com/shipments/', payload, {
        headers: authHeader(),
        timeout: 15000
    });

    const rates: any[] = Array.isArray(resp.data?.rates) ? resp.data.rates : [];
    const usable = rates.filter(r => r.amount && !r.messages?.length);
    if (usable.length === 0) return null;

    const cheapest = usable.reduce((best, r) => parseFloat(r.amount) < parseFloat(best.amount) ? r : best);
    return {
        cents: Math.round(parseFloat(cheapest.amount) * 100),
        provider: cheapest.provider,
        service: cheapest.servicelevel?.name ?? cheapest.servicelevel?.token ?? 'Standard',
        estimatedDays: cheapest.estimated_days ?? null
    };
}
